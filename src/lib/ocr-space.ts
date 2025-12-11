
export interface UserShiftResult {
    found: boolean;
    date: string;
    targetName: string;
    shift: string;
    startTime: string;
    endTime: string;
    colleagues: string[];
    rawContext: string;
}

const OCR_SPACE_KEY = "K84515341388957";

export async function findUserShiftOCRSpace(base64Image: string, targetName: string): Promise<UserShiftResult | null> {
    console.log(`[OCR.space] Starting Detective Mode for: ${targetName}`);

    try {
        const formData = new FormData();
        formData.append("base64Image", base64Image);
        formData.append("apikey", OCR_SPACE_KEY);
        formData.append("language", "spa");
        formData.append("isTable", "true");
        formData.append("isOverlayRequired", "true");
        formData.append("scale", "true");
        formData.append("OCREngine", "2"); // Engine 2 is better for numbers/tables

        const response = await fetch("/api/ocr-space", {
            method: "POST",
            body: formData,
        });

        const data = await response.json();

        if (data.IsErroredOnProcessing) {
            throw new Error(data.ErrorMessage?.[0] || "Unknown OCR Error");
        }

        const parsedResult = data.ParsedResults?.[0];
        if (!parsedResult) throw new Error("No results from OCR.space");

        const fullText = parsedResult.ParsedText || "";
        const overlay = parsedResult.TextOverlay;

        // If no overlay, fallback to text search only
        if (!overlay || !overlay.Lines) {
            console.warn("No Overlay found, using text-only fallback");
            // For brevity in this replacement, we keep the basic text logic or fail over.
            // But actually, we will wrap the Logic B here.
            // Fallback to original text-based logic if overlay is not available
            const lines = fullText.split('\n').filter((l: string) => l.trim().length > 0);
            const userLineIndex = lines.findIndex((l: string) => l.toUpperCase().includes(targetName.toUpperCase()));

            if (userLineIndex !== -1) {
                const userLine = lines[userLineIndex];
                let detectedShift = "HORARIO DETECTADO";
                let startTime = "--:--";
                let endTime = "--:--";

                const upperLine = userLine.toUpperCase();
                if (upperLine.includes("MAÑANA") || upperLine.includes(" M ") || upperLine.endsWith(" M")) detectedShift = "MAÑANA";
                else if (upperLine.includes("TARDE") || upperLine.includes(" T ") || upperLine.endsWith(" T")) detectedShift = "TARDE";
                else if (upperLine.includes("NOCHE") || upperLine.includes(" N ") || upperLine.endsWith(" N")) detectedShift = "NOCHE";

                const timeRegex = /(\d{1,2}[:.]\d{2})\s*[-a]\s*(\d{1,2}[:.]\d{2})/;
                const timeMatch = userLine.match(timeRegex);
                if (timeMatch) {
                    startTime = timeMatch[1].replace('.', ':');
                    endTime = timeMatch[2].replace('.', ':');
                    if (detectedShift === "HORARIO DETECTADO") detectedShift = `${startTime} - ${endTime}`;
                }

                if (detectedShift === "HORARIO DETECTADO" || detectedShift.includes("-")) {
                    const index = userLine.toUpperCase().indexOf(targetName.toUpperCase());
                    const len = userLine.length;
                    const ratio = index / len;

                    if (len > 25) {
                        if (ratio < 0.35) detectedShift = "MAÑANA";
                        else if (ratio < 0.65) detectedShift = "TARDE";
                        else detectedShift = "NOCHE";
                    }
                    else if (userLine.startsWith("     ")) {
                        if (index > 15) detectedShift = "NOCHE";
                        else detectedShift = "TARDE";
                    }
                    else {
                        if (detectedShift === "HORARIO DETECTADO") detectedShift = "MAÑANA";
                    }
                }

                return {
                    found: true,
                    date: new Date().toISOString().split('T')[0],
                    targetName: targetName.toUpperCase(),
                    shift: detectedShift,
                    startTime: startTime,
                    endTime: endTime,
                    colleagues: ["Ver contexto abajo"],
                    rawContext: `Línea (${userLine.length} chars, pos ${userLine.toUpperCase().indexOf(targetName.toUpperCase())}):\n"${userLine}"\n\nContexto:\n${lines.slice(Math.max(0, userLineIndex - 2), userLineIndex + 3).join('\n')}`
                };
            }
            return null; // If no overlay and no text match
        }

        // --- GEOMETRIC ANALYSIS ---

        let foundLineObj: any = null;
        let maxX = 0;
        let foundDate: string | null = null;

        // 1. Calculate Page Width (MaxX) and Find Target Line
        let salienteThresholdY = 100000;
        let salienteHeadersMap: { [key: string]: string } = { "left": "SERVICIO", "mid": "SERVICIO", "right": "SERVICIO" };

        for (const line of overlay.Lines) {
            // Update MaxX based on last word in line
            if (line.Words && line.Words.length > 0) {
                const lastWord = line.Words[line.Words.length - 1];
                const rightEdge = lastWord.Left + lastWord.Width;
                if (rightEdge > maxX) maxX = rightEdge;
            }

            // HEADER DATE DETECTION
            // Look for patterns like "11 DE DICIEMBRE DE 2025" or "11/12/2025"
            const lineText = line.LineText || line.Words.map((w: any) => w.WordText).join(" ");

            // Detect Salientes Section Start
            if (lineText.toUpperCase().includes("SALIENTES")) {
                salienteThresholdY = line.MinTop;
                console.log(`[OCR.SPACE] Salientes Section detected at Y=${salienteThresholdY}`);
            }

            // Only check top 10 lines for date
            if (line.MinTop < 500 && !foundDate) {
                // Spnish Date Regex: \d{1,2} DE [A-Z]+ DE \d{4}
                const dateMatch = lineText.toUpperCase().match(/(\d{1,2})\s+DE\s+([A-Z]+)\s+DE\s+(\d{4})/);
                if (dateMatch) {
                    // Parse Date
                    const day = dateMatch[1];
                    const monthStr = dateMatch[2];
                    const year = dateMatch[3];
                    const months: any = { "ENERO": "01", "FEBRERO": "02", "MARZO": "03", "ABRIL": "04", "MAYO": "05", "JUNIO": "06", "JULIO": "07", "AGOSTO": "08", "SEPTIEMBRE": "09", "OCTUBRE": "10", "NOVIEMBRE": "11", "DICIEMBRE": "12" };
                    if (months[monthStr]) {
                        foundDate = `${year}-${months[monthStr]}-${day.padStart(2, '0')}`;
                        console.log("Date Found in Header:", foundDate);
                    }
                }
            }

            // Check match
            if (!foundLineObj && lineText.toUpperCase().includes(targetName.toUpperCase())) {
                foundLineObj = line;
            }
        }

        // Second Pass: Find Service Headers in Salientes Section (if any)
        if (salienteThresholdY < 10000 && maxX > 0) {
            for (const line of overlay.Lines) {
                if (line.MinTop <= salienteThresholdY) continue; // Skip lines above Salientes

                const lineText = (line.LineText || line.Words.map((w: any) => w.WordText).join(" ")).toUpperCase();
                const serviceKeywords = ["PENITENCIARIO", "SUBDELEGACION", "PUERTAS", "ACUARTELAMIENTO", "CONTROLES", "PATRULLA", "SEGURIDAD", "PLANA MAYOR"];
                const matchedKeyword = serviceKeywords.find(k => lineText.includes(k));

                if (matchedKeyword) {
                    // Determine bucket
                    const firstWord = line.Words[0];
                    const lastWord = line.Words[line.Words.length - 1];
                    const midX = (firstWord.Left + lastWord.Left + lastWord.Width) / 2;
                    const ratio = midX / maxX;

                    let bucket = "mid";
                    if (ratio < 0.35) bucket = "left";
                    else if (ratio > 0.65) bucket = "right";

                    salienteHeadersMap[bucket] = matchedKeyword;
                    console.log(`[OCR.SPACE] Mapped Saliente Header '${matchedKeyword}' to bucket '${bucket}'`);
                }
            }
        }

        if (foundLineObj) {
            const lineText = foundLineObj.LineText || foundLineObj.Words.map((w: any) => w.WordText).join(" ");
            let detectedShift = "HORARIO DETECTADO";

            // Calculate Geometric Position
            // Get bounding box of the line (or at least the center of the first word vs last word)
            const firstWord = foundLineObj.Words[0];
            const lastWord = foundLineObj.Words[foundLineObj.Words.length - 1];

            if (firstWord && lastWord && maxX > 0) {
                const lineLeft = firstWord.Left;
                const lineRight = lastWord.Left + lastWord.Width;
                const lineCenter = (lineLeft + lineRight) / 2;
                const ratio = lineCenter / maxX;

                console.log(`Geometric Match: Center=${lineCenter}, MaxX=${maxX}, Ratio=${ratio}`);

                // Check if user is in Salientes Section
                if (foundLineObj.MinTop > salienteThresholdY) {
                    // In Salientes!
                    let bucket = "mid";
                    if (ratio < 0.35) bucket = "left";
                    else if (ratio > 0.65) bucket = "right";

                    const serviceName = salienteHeadersMap[bucket];
                    detectedShift = `SALIENTE ${serviceName}`;
                    console.log(`[OCR.SPACE] User is in Salientes Section (${bucket}). Shift: ${detectedShift}`);

                } else {
                    // Regular 3 Column Layout Logic
                    if (ratio < 0.35) detectedShift = "MAÑANA";
                    else if (ratio < 0.65) detectedShift = "TARDE";
                    else detectedShift = "NOCHE";
                }
            } else {
                // Fallback if geometry fails (single word line?)
                // Also check text-based Saliente fallback if needed, though hard without geometry
                if (lineText.toUpperCase().includes("MAÑANA")) detectedShift = "MAÑANA";
                else if (lineText.toUpperCase().includes("TARDE")) detectedShift = "TARDE";
                else if (lineText.toUpperCase().includes("NOCHE")) detectedShift = "NOCHE";
            }

            // Attempt to find time in the line (regex)
            let startTime = "--:--";
            let endTime = "--:--";
            const timeRegex = /(\d{1,2}[:.]\d{2})\s*[-a]\s*(\d{1,2}[:.]\d{2})/;
            const timeMatch = lineText.match(timeRegex);
            if (timeMatch) {
                startTime = timeMatch[1].replace('.', ':');
                endTime = timeMatch[2].replace('.', ':');
                if (detectedShift === "HORARIO DETECTADO") detectedShift = `${startTime} - ${endTime}`;
            }

            // --- FIND COLLEAGUES (Geometrically Close) ---
            const colleagues: string[] = [];

            // Search config
            const verticalTolerance = 60; // Approximate line height or cell buffer in pixels
            // We want lines that share the same "Column Ratio" roughly, and are vertically close.

            if (maxX > 0) {
                const targetLineCenter = (firstWord.Left + firstWord.Width / 2); // Center of first word is safer? No, use line center.
                const targetLineMid = (firstWord.Left + lastWord.Left + lastWord.Width) / 2;
                const targetTop = foundLineObj.MinTop;
                const targetBottom = targetTop + foundLineObj.MaxHeight; // Rough height

                // Scan all lines
                for (const otherLine of overlay.Lines) {
                    // Skip self
                    if (otherLine === foundLineObj) continue;

                    const text = otherLine.LineText || otherLine.Words.map((w: any) => w.WordText).join(" ");

                    // Skip obviously non-name lines (headers, empty) - Heuristic
                    if (text.length < 4 || text.includes("HORAS") || text.includes("SERVICIO")) continue;

                    // Geometric check
                    const otherFirst = otherLine.Words[0];
                    const otherLast = otherLine.Words[otherLine.Words.length - 1];

                    const otherMid = (otherFirst.Left + otherLast.Left + otherLast.Width) / 2;
                    const otherTop = otherLine.MinTop;

                    // 1. Column Check: Is it aligned horizontally?
                    // Using ratio difference:
                    const otherRatio = otherMid / maxX;
                    const targetRatio = targetLineMid / maxX;

                    // Identify column buckets instead of strict alignment to allow for name length variance
                    let otherBucket = "mid";
                    if (otherRatio < 0.35) otherBucket = "left";
                    else if (otherRatio > 0.65) otherBucket = "right";

                    let targetBucket = "mid";
                    if (targetRatio < 0.35) targetBucket = "left";
                    else if (targetRatio > 0.65) targetBucket = "right";

                    if (otherBucket !== targetBucket) continue;

                    // 2. Vertical Proximity Check: Is it close Y-wise?
                    // We look for lines in the same "cluster".
                    // For now, let's grab anything within +/- 200px? Or look for nearest neighbors?
                    // The roster has cells. It's safer to grab "nearest 3 neighbors".
                    const distY = Math.abs(otherTop - targetTop);

                    if (distY < 120) { // 120px is roughly 3-4 lines distance
                        colleagues.push(text);
                    }
                }
            }

            return {
                found: true,
                date: foundDate || new Date().toISOString().split('T')[0],
                targetName: targetName.toUpperCase(),
                shift: detectedShift,
                startTime: startTime,
                endTime: endTime,
                colleagues: colleagues.length > 0 ? colleagues : ["Sin compañeros detectados"],
                rawContext: `Detectado por Geometría (Ratio: ${(firstWord && lastWord && maxX) ? ((firstWord.Left + lastWord.Left + lastWord.Width) / 2 / maxX).toFixed(2) : 'N/A'})\nTexto: "${lineText}"`
            };
        }

        // Fallback for no overlay match but text match (rare)
        // ... return null or search raw text as before.

        return null;

    } catch (e: any) {
        console.error("OCR.space Failed:", e);
        return null;
    }
}
