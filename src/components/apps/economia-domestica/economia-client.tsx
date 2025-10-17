'use client';

import React, { useState, useEffect, useRef } from 'react';

// ============================================
// INTERFACES Y TIPOS
// ============================================

interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
}

interface MonthlyData {
    month: string;
    income: number;
    expenses: number;
    balance: number;
}

interface FinancialAnalysis {
    summary: {
        totalIncome: number;
        totalExpenses: number;
        balance: number;
        savingsRate: number;
    };
    transactions: Transaction[];
    categoryBreakdown: { category: string; amount: number; percentage: number }[];
    monthlyTrend: MonthlyData[];
    insights: string[];
    warnings: string[];
}

interface SmartRecommendation {
    title: string;
    description: string;
    potentialSavings: number;
    priority: 'high' | 'medium' | 'low';
    actionSteps: string[];
}

interface BudgetOptimization {
    currentSpending: { [key: string]: number };
    optimizedBudget: { [key: string]: number };
    recommendations: SmartRecommendation[];
    projectedSavings: number;
    timeToGoal: number; // in months
}

// ============================================
// CONFIGURACIÓN DE COLORES
// ============================================

const CHART_COLORS = {
    primary: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'],
    income: '#10b981',
    expense: '#ef4444',
    balance: '#3b82f6'
};

// ============================================
// COMPONENTES DE UI EN LÍNEA
// ============================================
// Para mantener todo en un solo archivo, definimos componentes de UI simplificados aquí.

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`p-6 border-b border-gray-200 ${className}`}>
        {children}
    </div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <h3 className={`text-lg font-semibold text-gray-800 ${className}`}>
        {children}
    </h3>
);

const CardDescription = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <p className={`text-sm text-gray-500 mt-1 ${className}`}>
        {children}
    </p>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`p-6 ${className}`}>
        {children}
    </div>
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...props }, ref) => (
    <input
        ref={ref}
        className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        {...props}
    />
));

const Button = ({ children, className = '', variant = 'primary', ...props }: { children: React.ReactNode, className?: string, variant?: 'primary' | 'secondary' | 'ghost', [key: string]: any }) => {
    const baseClasses = 'inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
        secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-400',
        ghost: 'bg-transparent text-blue-600 hover:bg-blue-50'
    };
    return (
        <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

const Alert = ({ children, className = '', variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'destructive' }) => {
    const variantClasses = {
        default: 'bg-blue-50 border-blue-200 text-blue-800',
        destructive: 'bg-red-50 border-red-200 text-red-800'
    };
    return (
        <div className={`p-4 border rounded-md ${variantClasses[variant]} ${className}`}>
            {children}
        </div>
    );
};

const AlertDescription = ({ children }: { children: React.ReactNode }) => (
    <div className="text-sm">{children}</div>
);

const TabsContext = React.createContext<{ activeTab: string; setActiveTab: (value: string) => void; }>({ activeTab: '', setActiveTab: () => {} });

const Tabs = ({ children, defaultValue, value, onValueChange }: { children: React.ReactNode, defaultValue: string, value: string, onValueChange: (value: string) => void }) => {
    return (
        <TabsContext.Provider value={{ activeTab: value, setActiveTab: onValueChange }}>
            <div>{children}</div>
        </TabsContext.Provider>
    );
};

const TabsList = ({ children }: { children: React.ReactNode }) => (
    <div className="flex border-b border-gray-200">{children}</div>
);

const TabsTrigger = ({ children, value }: { children: React.ReactNode, value: string }) => {
    const { activeTab, setActiveTab } = React.useContext(TabsContext);
    const isActive = activeTab === value;
    return (
        <button
            onClick={() => setActiveTab(value)}
            className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
            {children}
        </button>
    );
};

const TabsContent = ({ children, value }: { children: React.ReactNode, value: string }) => {
    const { activeTab } = React.useContext(TabsContext);
    return activeTab === value ? <div className="mt-6">{children}</div> : null;
};

// ============================================
// ICONOS SVG EN LÍNEA
// ============================================
// Reemplazamos lucide-react para un solo archivo

const Icon = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`inline-block w-5 h-5 ${className}`}>{children}</div>
);

const UploadIcon = () => <Icon><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg></Icon>;
const TrendingUpIcon = () => <Icon><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg></Icon>;
const TrendingDownIcon = () => <Icon><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg></Icon>;
const WalletIcon = () => <Icon><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg></Icon>;
const PieIcon = () => <Icon><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg></Icon>;
const SparklesIcon = () => <Icon><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8-5.8 1.9 5.8 1.9 1.9 5.8 1.9-5.8 5.8-1.9-5.8-1.9z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg></Icon>;
const FileTextIcon = () => <Icon><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></Icon>;
const DownloadIcon = () => <Icon><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg></Icon>;
const AlertCircleIcon = () => <Icon><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg></Icon>;
const CheckCircleIcon = () => <Icon><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></Icon>;
const TargetIcon = () => <Icon><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></Icon>;
const CalendarIcon = () => <Icon><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg></Icon>;


// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function SmartFinanceManager() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(null);
    const [optimization, setOptimization] = useState<BudgetOptimization | null>(null);
    const [savingsGoal, setSavingsGoal] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('upload');
    const [librariesReady, setLibrariesReady] = useState(false);
    
    // Importamos Recharts dinámicamente
    const [Recharts, setRecharts] = useState<any>(null);

    // Referencia al input de archivo
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ============================================
    // CARGA DE LIBRERÍAS EXTERNAS
    // ============================================

    useEffect(() => {
        const loadExternalLibraries = async () => {
            try {
                // Cargar XLSX
                await loadScript('https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js', 'XLSX');
                
                // Cargar PDF.js
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib');
                
                // Cargar Recharts
                const rechartsModule = await import('recharts');
                setRecharts(rechartsModule);

                // Configurar worker de PDF.js
                if ((window as any).pdfjsLib) {
                    (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }

                setLibrariesReady(true);
            } catch (err) {
                setError('Error al cargar las librerías necesarias. Recarga la página.');
            }
        };

        loadExternalLibraries();
    }, []);

    const loadScript = (src: string, globalVar: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if ((window as any)[globalVar]) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Error cargando ${src}`));
            document.head.appendChild(script);
        });
    };
    
    // ============================================
    // MANEJO DE ARCHIVOS Y EXTRACCIÓN DE TEXTO
    // ============================================
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };
    
    const extractTextFromFile = async (file: File): Promise<string> => {
        const fileName = file.name.toLowerCase();
        const fileType = file.type;

        if (fileName.endsWith('.pdf') || fileType.includes('pdf')) {
            return extractFromPDF(file);
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileType.includes('spreadsheet') || fileType.includes('excel')) {
            return extractFromExcel(file);
        } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileType.includes('text')) {
            return extractFromText(file);
        } else {
            throw new Error('Formato de archivo no soportado. Usa PDF, Excel (XLSX, XLS), CSV o TXT.');
        }
    };

    const extractFromPDF = async (file: File): Promise<string> => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error('PDF.js no está listo.');
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
        return fullText;
    };

    const extractFromExcel = async (file: File): Promise<string> => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) throw new Error('XLSX (SheetJS) no está listo.');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        let fullText = '';
        workbook.SheetNames.forEach((sheetName: string) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            jsonData.forEach((row: any) => {
                fullText += (row as any[]).join(', ') + '\n';
            });
        });
        return fullText;
    };

    const extractFromText = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    };

    // ============================================
    // LLAMADA A LA API DE GEMINI
    // ============================================

    const callGeminiAPI = async (prompt: string, schema: any): Promise<any> => {
        // En un entorno real, la API key no se expone en el cliente.
        // Canvas se encarga de proporcionar la clave de forma segura.
        const apiKey = ""; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                    temperature: 0.2,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Detalles del error de la API:", errorText);
            throw new Error(`Error en la API de IA: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!responseText) {
            throw new Error('La respuesta de la IA está vacía o tiene un formato incorrecto.');
        }

        try {
            return JSON.parse(responseText);
        } catch (e) {
            throw new Error('Error al procesar la respuesta JSON de la IA.');
        }
    };

    // ============================================
    // LÓGICA DE LA APLICACIÓN
    // ============================================

    const analyzeFinancialData = async () => {
        if (!file || !librariesReady) {
            setError('Por favor, selecciona un archivo y espera a que las librerías estén listas.');
            return;
        }

        setLoading(true);
        setLoadingMessage('Extrayendo datos del archivo...');
        setError(null);
        setAnalysis(null);
        setOptimization(null);
        
        try {
            const extractedText = await extractTextFromFile(file);
            if (!extractedText.trim()) {
                throw new Error('El archivo parece estar vacío o no contiene texto legible.');
            }
            
            setLoadingMessage('La IA está analizando tus finanzas...');
            
            const analysisSchema = { /* ... schema ... */ }; // Schema is complex, keeping it inline for brevity
            
            const analysisPrompt = `Eres un analista financiero experto. Analiza estos datos financieros extraídos de un documento. Los datos pueden estar desordenados. Tu tarea es limpiarlos, estructurarlos y proporcionar un análisis completo.

Datos extraídos:
\`\`\`
${extractedText.substring(0, 15000)}
\`\`\`

Basado en los datos, genera un objeto JSON con la siguiente estructura:
1.  **summary**: Un resumen con 'totalIncome', 'totalExpenses', 'balance' (income - expenses), y 'savingsRate' (en porcentaje, ej: 15.5).
2.  **transactions**: Una lista de TODAS las transacciones. Cada una debe tener: 'id' (único), 'date' (formato YYYY-MM-DD), 'description' (limpia y concisa), 'amount' (número positivo), 'type' ('income' o 'expense'), y 'category'.
3.  **categoryBreakdown**: Un desglose de gastos por categoría. Cada objeto debe tener 'category', 'amount' (suma total de gastos en esa categoría) y 'percentage' del total de gastos.
4.  **monthlyTrend**: Un análisis mes a mes. Cada objeto debe tener 'month' (formato YYYY-MM), 'income', 'expenses' y 'balance' para ese mes.
5.  **insights**: Un array de 3-5 observaciones clave y accionables sobre los patrones de gasto o ingresos (en español).
6.  **warnings**: Un array de 1-3 advertencias sobre posibles problemas, como gastos elevados en ciertas áreas o deudas (en español).

Usa estas categorías: 'Salario', 'Ingresos Pasivos', 'Vivienda', 'Transporte', 'Alimentación', 'Servicios Básicos', 'Salud', 'Entretenimiento', 'Compras', 'Educación', 'Deudas', 'Inversiones', 'Otros Gastos', 'Otros Ingresos'. Si no puedes determinar una fecha, usa una aproximada. Responde en español.`;

            const analysisResult = await callGeminiAPI(analysisPrompt, {
                type: "OBJECT",
                properties: {
                    summary: { type: "OBJECT", properties: { totalIncome: { type: "NUMBER" }, totalExpenses: { type: "NUMBER" }, balance: { type: "NUMBER" }, savingsRate: { type: "NUMBER" } } },
                    transactions: { type: "ARRAY", items: { type: "OBJECT", properties: { id: { type: "STRING" }, date: { type: "STRING" }, description: { type: "STRING" }, amount: { type: "NUMBER" }, type: { type: "STRING" }, category: { type: "STRING" } } } },
                    categoryBreakdown: { type: "ARRAY", items: { type: "OBJECT", properties: { category: { type: "STRING" }, amount: { type: "NUMBER" }, percentage: { type: "NUMBER" } } } },
                    monthlyTrend: { type: "ARRAY", items: { type: "OBJECT", properties: { month: { type: "STRING" }, income: { type: "NUMBER" }, expenses: { type: "NUMBER" }, balance: { type: "NUMBER" } } } },
                    insights: { type: "ARRAY", items: { type: "STRING" } },
                    warnings: { type: "ARRAY", items: { type: "STRING" } }
                }
            });
            
            setAnalysis(analysisResult);
            setActiveTab('analysis');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const optimizeBudget = async () => {
        if (!analysis || !savingsGoal || Number(savingsGoal) <= 0) {
            setError('Realiza primero el análisis y establece un objetivo de ahorro mensual válido.');
            return;
        }

        setLoading(true);
        setLoadingMessage('La IA está creando tu plan de optimización...');
        setError(null);
        
        try {
            const optimizationPrompt = `Eres un asesor financiero experto en optimización de presupuestos. Basado en el siguiente análisis financiero de un cliente, crea un plan para ayudarle a alcanzar su objetivo de ahorro.

**Análisis Actual:**
- Ingreso Total: ${analysis.summary.totalIncome}
- Gasto Total: ${analysis.summary.totalExpenses}
- Desglose de Gastos: ${JSON.stringify(analysis.categoryBreakdown)}

**Objetivo del Cliente:**
- Ahorrar ${savingsGoal} al mes.

**Tu Tarea:**
Crea un objeto JSON con la siguiente estructura:
1.  **currentSpending**: Un objeto que muestra el gasto actual por categoría (solo las de gastos).
2.  **optimizedBudget**: Un objeto con el presupuesto optimizado por categoría, diseñado para alcanzar el objetivo de ahorro. Reduce gastos en categorías no esenciales.
3.  **recommendations**: Un array de 3 a 5 recomendaciones inteligentes y prácticas. Cada recomendación debe tener 'title', 'description', 'potentialSavings' (estimado mensual), 'priority' ('high', 'medium', 'low'), y 'actionSteps' (array de pasos concretos).
4.  **projectedSavings**: El ahorro mensual total proyectado con el nuevo presupuesto.
5.  **timeToGoal**: El tiempo estimado en meses para alcanzar un objetivo hipotético de 10,000 con el nuevo ahorro proyectado (calcula 10000 / projectedSavings).

Sé realista y práctico. No reduzcas categorías esenciales como 'Vivienda' o 'Servicios Básicos' a cero. Enfócate en 'Entretenimiento', 'Compras', 'Alimentación' (suscripciones, comer fuera). Responde en español.`;

            const optimizationResult = await callGeminiAPI(optimizationPrompt, {
                type: "OBJECT",
                properties: {
                    currentSpending: { type: "OBJECT", additionalProperties: { type: "NUMBER" } },
                    optimizedBudget: { type: "OBJECT", additionalProperties: { type: "NUMBER" } },
                    recommendations: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, description: { type: "STRING" }, potentialSavings: { type: "NUMBER" }, priority: { type: "STRING" }, actionSteps: { type: "ARRAY", items: { type: "STRING" } } } } },
                    projectedSavings: { type: "NUMBER" },
                    timeToGoal: { type: "NUMBER" }
                }
            });

            setOptimization(optimizationResult);
            setActiveTab('optimization');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const exportData = () => {
        if (!analysis) {
            setError("No hay datos para exportar.");
            return;
        }
        const dataToExport = {
            analysis,
            optimization: optimization || "No generado",
        };
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analisis_financiero_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ============================================
    // RENDERIZADO DE COMPONENTES
    // ============================================

    const renderSummaryCard = (title: string, value: number, icon: React.ReactNode, format: 'EUR' | '%' = 'EUR') => {
        let formattedValue;

        try {
            if (format === '%') {
                // La IA devuelve un número como 15.5 para 15.5%, así que lo dividimos por 100 para formatearlo.
                formattedValue = (value / 100).toLocaleString('es-ES', { style: 'percent', minimumFractionDigits: 1 });
            } else {
                formattedValue = value.toLocaleString('es-ES', { style: 'currency', currency: format });
            }
        } catch (e) {
            // Fallback en caso de un error inesperado de formato
            formattedValue = `${value}${format === 'EUR' ? '€' : '%'}`;
            console.error("Error de formato en renderSummaryCard:", e);
        }

        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    {icon}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formattedValue}</div>
                </CardContent>
            </Card>
        );
    };

    if (!Recharts) {
        return <div className="flex items-center justify-center h-screen bg-gray-50"><div className="text-lg">Cargando componentes...</div></div>;
    }

    const { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;

    return (
        <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                        <SparklesIcon />
                        <span className="ml-2">Gestor Financiero Personal con IA</span>
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Sube tus extractos bancarios (PDF, Excel, CSV) y obtén un análisis financiero inteligente y un plan de ahorro personalizado.
                    </p>
                </header>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="upload">
                    <TabsList>
                        <TabsTrigger value="upload">1. Cargar Documento</TabsTrigger>
                        <TabsTrigger value="analysis">2. Análisis Financiero</TabsTrigger>
                        <TabsTrigger value="optimization">3. Optimización y Ahorro</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="upload">
                        <Card className="max-w-2xl mx-auto">
                            <CardHeader>
                                <CardTitle>Sube tu extracto bancario</CardTitle>
                                <CardDescription>Aceptamos archivos PDF, Excel (XLSX, XLS), CSV y TXT.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div 
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-blue-500 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <UploadIcon />
                                    <p className="mt-2 text-sm text-gray-600">
                                        {file ? `Archivo seleccionado: ${file.name}` : 'Haz clic o arrastra un archivo aquí'}
                                    </p>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileChange}
                                        accept=".pdf,.xlsx,.xls,.csv,.txt"
                                    />
                                </div>
                                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                                <Button 
                                    onClick={analyzeFinancialData} 
                                    disabled={!file || loading || !librariesReady}
                                    className="w-full"
                                >
                                    {loading ? loadingMessage : 'Analizar con IA'}
                                </Button>
                                {!librariesReady && <p className="text-xs text-center text-gray-500">Inicializando librerías...</p>}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="analysis">
                        {!analysis && !loading && (
                            <div className="text-center py-12 text-gray-500">
                                <FileTextIcon />
                                <p className="mt-2">Completa el paso 1 para ver tu análisis financiero.</p>
                            </div>
                        )}
                        {loading && activeTab === 'analysis' && (
                             <div className="text-center py-12 text-gray-500">{loadingMessage}</div>
                        )}
                        {analysis && (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    {renderSummaryCard('Ingresos Totales', analysis.summary.totalIncome, <TrendingUpIcon />, 'EUR')}
                                    {renderSummaryCard('Gastos Totales', analysis.summary.totalExpenses, <TrendingDownIcon />, 'EUR')}
                                    {renderSummaryCard('Balance Neto', analysis.summary.balance, <WalletIcon />, 'EUR')}
                                    {renderSummaryCard('Tasa de Ahorro', analysis.summary.savingsRate, <PieIcon />, '%')}
                                </div>
                                
                                <div className="grid gap-6 lg:grid-cols-5">
                                    <Card className="lg:col-span-2">
                                        <CardHeader><CardTitle>Desglose de Gastos</CardTitle></CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Pie data={analysis.categoryBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={100} label>
                                                        {analysis.categoryBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS.primary[index % CHART_COLORS.primary.length]} />)}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number) => `${value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                    <Card className="lg:col-span-3">
                                        <CardHeader><CardTitle>Tendencia Mensual</CardTitle></CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={analysis.monthlyTrend}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="month" />
                                                    <YAxis />
                                                    <Tooltip formatter={(value: number) => `${value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`} />
                                                    <Legend />
                                                    <Bar dataKey="income" fill={CHART_COLORS.income} name="Ingresos" />
                                                    <Bar dataKey="expenses" fill={CHART_COLORS.expense} name="Gastos" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>
                                
                                <div className="grid gap-6 lg:grid-cols-2">
                                    <Card>
                                        <CardHeader><CardTitle>Insights Clave de la IA</CardTitle></CardHeader>
                                        <CardContent>
                                            <ul className="space-y-3">
                                                {analysis.insights.map((insight, i) => (
                                                    <li key={i} className="flex items-start">
                                                        <CheckCircleIcon />
                                                        <span className="ml-2 text-sm">{insight}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader><CardTitle>Advertencias y Áreas de Mejora</CardTitle></CardHeader>
                                        <CardContent>
                                             <ul className="space-y-3">
                                                {analysis.warnings.map((warning, i) => (
                                                    <li key={i} className="flex items-start">
                                                        <AlertCircleIcon />
                                                        <span className="ml-2 text-sm">{warning}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Button onClick={exportData} variant="secondary"><DownloadIcon /><span className="ml-2">Exportar Análisis</span></Button>
                            </div>
                        )}
                    </TabsContent>
                    
                    <TabsContent value="optimization">
                        {!analysis && !loading && (
                            <div className="text-center py-12 text-gray-500">
                                <TargetIcon />
                                <p className="mt-2">Analiza tus finanzas para poder crear un plan de optimización.</p>
                            </div>
                        )}
                        {loading && activeTab === 'optimization' && (
                            <div className="text-center py-12 text-gray-500">{loadingMessage}</div>
                        )}
                        {analysis && !optimization && (
                            <Card className="max-w-2xl mx-auto">
                                <CardHeader>
                                    <CardTitle>Define tu Objetivo de Ahorro</CardTitle>
                                    <CardDescription>Indica cuánto te gustaría ahorrar cada mes para que la IA cree un plan para ti.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Input 
                                        type="number" 
                                        value={savingsGoal} 
                                        onChange={(e) => setSavingsGoal(e.target.value)}
                                        placeholder="Ej: 300" 
                                    />
                                    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                                    <Button onClick={optimizeBudget} disabled={loading} className="w-full">
                                        {loading ? 'Optimizando...' : 'Crear Plan de Ahorro'}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                        {optimization && (
                           <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-3">
                                    {renderSummaryCard('Ahorro Actual', analysis.summary.balance, <WalletIcon />, 'EUR')}
                                    {renderSummaryCard('Objetivo de Ahorro', Number(savingsGoal), <TargetIcon />, 'EUR')}
                                    {renderSummaryCard('Nuevo Ahorro Proyectado', optimization.projectedSavings, <TrendingUpIcon />, 'EUR')}
                                </div>
                                <Card>
                                    <CardHeader><CardTitle>Recomendaciones de la IA para Ahorrar</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        {optimization.recommendations.map((rec, i) => (
                                            <div key={i} className="p-4 border rounded-md bg-gray-50">
                                                <h4 className="font-semibold text-gray-800">{rec.title}</h4>
                                                <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                                                <p className="text-sm font-medium text-green-600 mt-2">Ahorro Potencial: {rec.potentialSavings.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}/mes</p>
                                                <div className="mt-3">
                                                    <h5 className="text-xs font-semibold text-gray-500 uppercase">Pasos a seguir</h5>
                                                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-1">
                                                        {rec.actionSteps.map((step, j) => <li key={j}>{step}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                                <Button onClick={exportData} variant="secondary"><DownloadIcon /><span className="ml-2">Exportar Plan</span></Button>
                           </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
