import { NextResponse } from 'next/server';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
    try {
        const { name, scheduleData } = await req.json();

        if (!name || !scheduleData) {
            return NextResponse.json({
                success: false,
                error: "Nombre y datos del cuadrante requeridos"
            }, { status: 400, headers: corsHeaders });
        }

        const searchName = name.toLowerCase().trim();
        const schedule = scheduleData.shifts || scheduleData;
        const dates = scheduleData.dates || [];

        // Find the person in the schedule (fuzzy match)
        let matchedName: string | null = null;
        const employees = Object.keys(schedule);

        for (const emp of employees) {
            if (emp.toLowerCase().includes(searchName) || searchName.includes(emp.toLowerCase())) {
                matchedName = emp;
                break;
            }
        }

        if (!matchedName) {
            return NextResponse.json({
                success: false,
                error: `No se encontró a "${name}" en el cuadrante. Trabajadores detectados: ${employees.join(', ')}`
            }, { headers: corsHeaders });
        }

        // Get shifts for the matched person
        const personShifts = schedule[matchedName];
        const shifts = [];

        for (const [date, info] of Object.entries(personShifts as Record<string, any>)) {
            // Find coworkers for same shift
            const coworkers: string[] = [];
            for (const [emp, empShifts] of Object.entries(schedule)) {
                if (emp !== matchedName) {
                    const empShiftData = (empShifts as Record<string, any>)[date];
                    if (empShiftData && empShiftData.shift === info.shift && empShiftData.location === info.location) {
                        coworkers.push(emp);
                    }
                }
            }

            shifts.push({
                name: matchedName,
                date: date,
                shift: info.shift || 'No especificado',
                location: info.location || 'No especificada',
                coworkers
            });
        }

        return NextResponse.json({
            success: true,
            shifts
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error("Cuadrante search error:", error);
        return NextResponse.json({
            success: false,
            error: `Error: ${error.message}`
        }, { status: 500, headers: corsHeaders });
    }
}
