// Response Engine for Quioba Assistant
// Detects user intent and generates appropriate responses

import { supabase } from '@/lib/supabase';
import {
    fetchSavingsSummary,
    fetchPendingTasks,
    fetchShoppingList,
    fetchMedicines,
    fetchInsurances,
    fetchExpensesSummary,
    fetchVehicles,
    fetchRecurringItems,
    AssistantDataContext,
} from './data-fetchers';

// Re-export for use in other components
export type { AssistantDataContext };


export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface AssistantResponse {
    keywords: string[];
    category: string;
    response_template: string;
    priority: number;
}

// Intent types that require data fetching
type DataIntent =
    | 'savings_total'
    | 'tasks_pending'
    | 'shopping_list'
    | 'medicines'
    | 'insurances'
    | 'expenses_month'
    | 'vehicles'
    | 'recurring_items';

// Intent keywords mapping
const DATA_INTENTS: Record<DataIntent, string[]> = {
    savings_total: ['dinero', 'ahorrado', 'ahorro', 'ahorros', 'saldo', 'balance', 'cuánto tengo', 'cuanto tengo', 'piggy', 'hucha'],
    tasks_pending: ['tareas', 'tarea', 'pendiente', 'pendientes', 'hacer', 'to-do', 'todo', 'recordatorio', 'alarma'],
    shopping_list: ['comprar', 'compra', 'compras', 'lista', 'supermercado', 'mercado', 'carrito'],
    medicines: ['medicamento', 'medicamentos', 'medicina', 'medicinas', 'pastilla', 'pastillas', 'botiquín', 'farmacia'],
    insurances: ['seguro', 'seguros', 'póliza', 'poliza', 'pólizas', 'polizas', 'aseguradora'],
    expenses_month: ['gasto', 'gastos', 'gastado', 'mes', 'mensual', 'cuánto he gastado', 'cuanto he gastado'],
    vehicles: ['coche', 'coches', 'carro', 'carros', 'moto', 'motos', 'vehículo', 'vehiculo', 'vehículos', 'vehiculos', 'itv', 'mantenimiento'],
    recurring_items: ['recurrente', 'recurrentes', 'fijo', 'fijos', 'ingresos fijos', 'gastos fijos', 'mensualidad'],
};

// Normalize text for matching
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[¿?¡!.,;:]/g, '')
        .trim();
}

// Simple fuzzy match score
function fuzzyScore(query: string, keyword: string): number {
    const q = normalizeText(query);
    const k = normalizeText(keyword);

    if (q.includes(k) || k.includes(q)) return 1;

    // Check for partial match
    const words = q.split(/\s+/);
    for (const word of words) {
        if (word.length >= 3 && (word.includes(k) || k.includes(word))) {
            return 0.8;
        }
    }

    return 0;
}

// Detect data intent from user query
function detectDataIntent(query: string): DataIntent | null {
    const normalized = normalizeText(query);

    let bestIntent: DataIntent | null = null;
    let bestScore = 0;

    for (const [intent, keywords] of Object.entries(DATA_INTENTS)) {
        for (const keyword of keywords) {
            const score = fuzzyScore(normalized, keyword);
            if (score > bestScore) {
                bestScore = score;
                bestIntent = intent as DataIntent;
            }
        }
    }

    return bestScore >= 0.8 ? bestIntent : null;
}

// Fetch predefined responses from database
async function fetchPredefinedResponse(query: string): Promise<AssistantResponse | null> {
    const { data: responses } = await supabase
        .from('assistant_responses')
        .select('keywords, category, response_template, priority')
        .eq('is_active', true)
        .order('priority', { ascending: false });

    if (!responses || responses.length === 0) return null;

    const normalized = normalizeText(query);
    let bestMatch: AssistantResponse | null = null;
    let bestScore = 0;

    for (const response of responses) {
        for (const keyword of response.keywords) {
            const score = fuzzyScore(normalized, keyword);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = response;
            }
        }
    }

    return bestScore >= 0.8 ? bestMatch : null;
}

// Format currency
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
    }).format(amount);
}

// Format date
function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

// Generate response for savings intent
async function generateSavingsResponse(ctx: AssistantDataContext): Promise<string> {
    const data = await fetchSavingsSummary(ctx);

    if (data.goalsCount === 0 && data.accountsCount === 0) {
        return '💰 Aún no tienes cuentas de ahorro ni metas configuradas. ¡Empieza a ahorrar creando tu primera cuenta en la sección de Ahorros!';
    }

    let response = `💰 **Tu resumen de ahorros:**\n\n`;
    response += `**Total ahorrado:** ${formatCurrency(data.totalSaved)}\n\n`;

    if (data.goals.length > 0) {
        response += `📎 **Metas de ahorro (${data.goalsCount}):**\n`;
        for (const goal of data.goals.slice(0, 5)) {
            const progress = goal.target_amount > 0
                ? Math.round((goal.current_amount / goal.target_amount) * 100)
                : 0;
            response += `• ${goal.name}: ${formatCurrency(goal.current_amount)} (${progress}%)\n`;
        }
        if (data.goals.length > 5) {
            response += `... y ${data.goals.length - 5} más\n`;
        }
        response += '\n';
    }

    if (data.accounts.length > 0) {
        response += `🏦 **Cuentas bancarias (${data.accountsCount}):**\n`;
        for (const acc of data.accounts.slice(0, 5)) {
            response += `• ${acc.name} (${acc.bank_name || 'Otro'}): ${formatCurrency(acc.current_balance)}\n`;
        }
        if (data.accounts.length > 5) {
            response += `... y ${data.accounts.length - 5} más\n`;
        }
    }

    return response;
}

// Generate response for tasks intent
async function generateTasksResponse(ctx: AssistantDataContext): Promise<string> {
    const data = await fetchPendingTasks(ctx);

    if (data.total === 0) {
        return '✅ ¡No tienes tareas pendientes! Disfruta tu tiempo libre 🎉';
    }

    let response = `📋 **Tus tareas pendientes (${data.total}):**\n\n`;

    if (data.overdue.length > 0) {
        response += `⚠️ **Atrasadas (${data.overdue.length}):**\n`;
        for (const task of data.overdue.slice(0, 3)) {
            response += `• ${task.title}${task.priority === 'high' ? ' 🔴' : ''}\n`;
        }
        response += '\n';
    }

    if (data.today.length > 0) {
        response += `📅 **Para hoy (${data.today.length}):**\n`;
        for (const task of data.today.slice(0, 3)) {
            response += `• ${task.title}${task.priority === 'high' ? ' 🔴' : ''}\n`;
        }
        response += '\n';
    }

    if (data.upcoming.length > 0) {
        response += `🔜 **Próximas (${data.upcoming.length}):**\n`;
        for (const task of data.upcoming.slice(0, 3)) {
            const date = task.due_date ? formatDate(task.due_date) : '';
            response += `• ${task.title} - ${date}\n`;
        }
    }

    return response;
}

// Generate response for shopping list intent
async function generateShoppingResponse(ctx: AssistantDataContext): Promise<string> {
    const data = await fetchShoppingList(ctx);

    if (data.total === 0) {
        return '🛒 Tu lista de la compra está vacía. ¡Añade productos cuando los necesites!';
    }

    let response = `🛒 **Lista de la compra (${data.total} items):**\n\n`;

    for (const [category, items] of Object.entries(data.byCategory)) {
        response += `**${category}:**\n`;
        for (const item of (items as any[]).slice(0, 5)) {
            const qty = item.quantity > 1 ? ` (x${item.quantity})` : '';
            response += `• ${item.name}${qty}\n`;
        }
        response += '\n';
    }

    return response;
}

// Generate response for medicines intent
async function generateMedicinesResponse(ctx: AssistantDataContext): Promise<string> {
    const data = await fetchMedicines(ctx);

    if (data.total === 0) {
        return '💊 No tienes medicamentos registrados en tu botiquín.';
    }

    let response = `💊 **Tu botiquín (${data.total} medicamentos):**\n\n`;

    if (data.lowStock.length > 0) {
        response += `⚠️ **Stock bajo:**\n`;
        for (const med of data.lowStock.slice(0, 3)) {
            response += `• ${med.name} (quedan ${med.stock})\n`;
        }
        response += '\n';
    }

    if (data.expiringSoon.length > 0) {
        response += `⏰ **Próximos a caducar:**\n`;
        for (const med of data.expiringSoon.slice(0, 3)) {
            response += `• ${med.name} - ${formatDate(med.expiry_date)}\n`;
        }
        response += '\n';
    }

    response += `**Medicamentos:**\n`;
    for (const med of data.medicines.slice(0, 5)) {
        response += `• ${med.name}${med.dosage ? ` - ${med.dosage}` : ''}\n`;
    }
    if (data.medicines.length > 5) {
        response += `... y ${data.medicines.length - 5} más\n`;
    }

    return response;
}

// Generate response for insurances intent
async function generateInsurancesResponse(ctx: AssistantDataContext): Promise<string> {
    const data = await fetchInsurances(ctx);

    if (data.total === 0) {
        return '📋 No tienes seguros registrados.';
    }

    let response = `🛡️ **Tus seguros (${data.total}):**\n\n`;

    if (data.expiringSoon.length > 0) {
        response += `⚠️ **Próximos a vencer:**\n`;
        for (const ins of data.expiringSoon) {
            response += `• ${ins.name} - ${formatDate(ins.expiration_date)}\n`;
        }
        response += '\n';
    }

    response += `**Listado:**\n`;
    for (const ins of data.insurances.slice(0, 5)) {
        const exp = ins.expiration_date ? ` (vence: ${formatDate(ins.expiration_date)})` : '';
        response += `• ${ins.name} - ${ins.provider || 'Sin aseguradora'}${exp}\n`;
    }

    return response;
}

// Generate response for expenses intent
async function generateExpensesResponse(ctx: AssistantDataContext): Promise<string> {
    const data = await fetchExpensesSummary(ctx);

    const monthName = new Date().toLocaleDateString('es-ES', { month: 'long' });

    if (data.total === 0) {
        return `💸 No tienes gastos registrados este mes (${monthName}).`;
    }

    let response = `💸 **Gastos de ${monthName}:**\n\n`;
    response += `**Total gastado:** ${formatCurrency(data.totalThisMonth)}\n\n`;

    if (Object.keys(data.byCategory).length > 0) {
        response += `**Por categoría:**\n`;
        const sorted = Object.entries(data.byCategory).sort((a, b) => b[1] - a[1]);
        for (const [cat, amount] of sorted.slice(0, 6)) {
            response += `• ${cat}: ${formatCurrency(amount)}\n`;
        }
    }

    return response;
}

// Generate response for vehicles intent
async function generateVehiclesResponse(ctx: AssistantDataContext): Promise<string> {
    const data = await fetchVehicles(ctx);

    if (data.total === 0) {
        return '🚗 No tienes vehículos registrados.';
    }

    let response = `🚗 **Tus vehículos (${data.total}):**\n\n`;

    if (data.pendingITV.length > 0) {
        response += `⚠️ **ITV próxima:**\n`;
        for (const v of data.pendingITV) {
            response += `• ${v.name} - ${formatDate(v.next_itv_date)}\n`;
        }
        response += '\n';
    }

    if (data.pendingMaintenance.length > 0) {
        response += `🔧 **Mantenimiento pendiente:**\n`;
        for (const v of data.pendingMaintenance) {
            response += `• ${v.name}\n`;
        }
        response += '\n';
    }

    for (const v of data.vehicles) {
        response += `**${v.name}** (${v.brand} ${v.model})\n`;
        response += `  Matrícula: ${v.license_plate || 'N/A'}\n`;
    }

    return response;
}

// Generate response for recurring items intent
async function generateRecurringResponse(ctx: AssistantDataContext): Promise<string> {
    const data = await fetchRecurringItems(ctx);

    if (data.total === 0) {
        return '📊 No tienes ingresos ni gastos recurrentes configurados.';
    }

    let response = `📊 **Ingresos y gastos recurrentes:**\n\n`;

    if (data.income.length > 0) {
        response += `💚 **Ingresos (${data.income.length}):** ${formatCurrency(data.totalIncome)}/mes\n`;
        for (const item of data.income.slice(0, 3)) {
            const day = item.day_of_month ? `día ${item.day_of_month}` : '';
            response += `• ${item.name}: ${formatCurrency(item.amount)} ${day}\n`;
        }
        response += '\n';
    }

    if (data.expenses.length > 0) {
        response += `❤️ **Gastos (${data.expenses.length}):** ${formatCurrency(data.totalExpenses)}/mes\n`;
        for (const item of data.expenses.slice(0, 3)) {
            const day = item.day_of_month ? `día ${item.day_of_month}` : '';
            response += `• ${item.name}: ${formatCurrency(item.amount)} ${day}\n`;
        }
    }

    const balance = data.totalIncome - data.totalExpenses;
    response += `\n**Balance mensual:** ${formatCurrency(balance)} ${balance >= 0 ? '✅' : '⚠️'}`;

    return response;
}

// Main function to process user query and generate response
export async function processQuery(query: string, ctx: AssistantDataContext): Promise<string> {
    // First check for data intents
    const dataIntent = detectDataIntent(query);

    if (dataIntent) {
        switch (dataIntent) {
            case 'savings_total':
                return generateSavingsResponse(ctx);
            case 'tasks_pending':
                return generateTasksResponse(ctx);
            case 'shopping_list':
                return generateShoppingResponse(ctx);
            case 'medicines':
                return generateMedicinesResponse(ctx);
            case 'insurances':
                return generateInsurancesResponse(ctx);
            case 'expenses_month':
                return generateExpensesResponse(ctx);
            case 'vehicles':
                return generateVehiclesResponse(ctx);
            case 'recurring_items':
                return generateRecurringResponse(ctx);
        }
    }

    // Then check for predefined responses
    const predefined = await fetchPredefinedResponse(query);
    if (predefined) {
        // Replace placeholders in template
        let response = predefined.response_template;
        response = response.replace('{user_name}', ctx.userName || 'usuario');
        return response;
    }

    // Default response
    return `🤔 No estoy seguro de cómo responder a eso. Prueba a preguntarme sobre:\n\n• Tus ahorros: "¿Cuánto dinero tengo?"\n• Tus tareas: "¿Qué tareas tengo pendientes?"\n• Tu lista de compra: "¿Qué tengo que comprar?"\n• Tus medicamentos: "¿Qué hay en mi botiquín?"\n• Tus seguros: "¿Qué seguros tengo?"\n• Tus gastos: "¿Cuánto he gastado este mes?"\n• Tus vehículos: "¿Info de mis coches?"`;
}

// Save conversation to database
export async function saveConversation(userId: string, messages: Message[]): Promise<void> {
    // First check if conversation exists
    const { data: existing } = await supabase
        .from('assistant_conversations')
        .select('id')
        .eq('user_id', userId)
        .single();

    if (existing) {
        await supabase
            .from('assistant_conversations')
            .update({
                messages: messages,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
    } else {
        await supabase
            .from('assistant_conversations')
            .insert({
                user_id: userId,
                messages: messages,
            });
    }
}

// Load conversation from database
export async function loadConversation(userId: string): Promise<Message[]> {
    const { data } = await supabase
        .from('assistant_conversations')
        .select('messages')
        .eq('user_id', userId)
        .single();

    return (data?.messages as Message[]) || [];
}

// Clear conversation
export async function clearConversation(userId: string): Promise<void> {
    await supabase
        .from('assistant_conversations')
        .update({ messages: [] })
        .eq('user_id', userId);
}
