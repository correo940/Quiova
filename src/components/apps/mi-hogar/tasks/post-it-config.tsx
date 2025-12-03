'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePostItSettings } from '@/context/PostItSettingsContext';
import { Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';

export default function PostItConfig() {
    const {
        isVisible, setIsVisible,
        colors, setColors,
        snoozeDuration, setSnoozeDuration,
        position, setPosition,
        opacity, setOpacity,
        layout, setLayout
    } = usePostItSettings();

    const [isOpen, setIsOpen] = React.useState(false);

    const handleColorChange = (key: keyof typeof colors, value: string) => {
        setColors({ ...colors, [key]: value });
    };

    // Predefined color palettes (Tailwind classes without opacity)
    const colorOptions = [
        { label: 'Rojo Suave', value: 'bg-red-200 dark:bg-red-300' },
        { label: 'Verde Suave', value: 'bg-green-200 dark:bg-green-300' },
        { label: 'Azul Suave', value: 'bg-blue-200 dark:bg-blue-300' },
        { label: 'Amarillo Suave', value: 'bg-[#fef3c7] dark:bg-[#fcd34d]' },
        { label: 'Naranja Suave', value: 'bg-orange-200 dark:bg-orange-300' },
        { label: 'Violeta Suave', value: 'bg-violet-200 dark:bg-violet-300' },
        { label: 'Rosa Suave', value: 'bg-pink-200 dark:bg-pink-300' },
        { label: 'Gris Suave', value: 'bg-gray-200 dark:bg-gray-300' },
    ];

    return (
        <Card className="w-full">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Settings2 className="w-4 h-4" />
                            Configurar Post-its
                        </CardTitle>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-9 p-0">
                                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                <span className="sr-only">Toggle</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0">
                        {/* Visibility */}
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-postits">Mostrar Post-its</Label>
                            <Switch
                                id="show-postits"
                                checked={isVisible}
                                onCheckedChange={setIsVisible}
                            />
                        </div>

                        {/* Opacity */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Opacidad</Label>
                                <span className="text-xs text-muted-foreground">{Math.round(opacity * 100)}%</span>
                            </div>
                            <Slider
                                value={[opacity]}
                                min={0.1}
                                max={1}
                                step={0.05}
                                onValueChange={(vals) => setOpacity(vals[0])}
                            />
                        </div>

                        {/* Snooze Duration */}
                        <div className="space-y-2">
                            <Label>Tiempo de "Snooze" (al cerrar)</Label>
                            <Select
                                value={snoozeDuration.toString()}
                                onValueChange={(v) => setSnoozeDuration(parseInt(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona duración" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 minuto</SelectItem>
                                    <SelectItem value="3">3 minutos</SelectItem>
                                    <SelectItem value="5">5 minutos</SelectItem>
                                    <SelectItem value="10">10 minutos</SelectItem>
                                    <SelectItem value="30">30 minutos</SelectItem>
                                    <SelectItem value="60">1 hora</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Position */}
                        <div className="space-y-2">
                            <Label>Posición en pantalla</Label>
                            <Select
                                value={position}
                                onValueChange={(v: any) => setPosition(v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona posición" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="top-left">Arriba Izquierda</SelectItem>
                                    <SelectItem value="top-center">Arriba Centro</SelectItem>
                                    <SelectItem value="top-right">Arriba Derecha</SelectItem>
                                    <SelectItem value="bottom-left">Abajo Izquierda</SelectItem>
                                    <SelectItem value="bottom-center">Abajo Centro</SelectItem>
                                    <SelectItem value="bottom-right">Abajo Derecha</SelectItem>
                                    <SelectItem value="center">Centro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Layout */}
                        <div className="space-y-2">
                            <Label>Disposición</Label>
                            <Select
                                value={layout}
                                onValueChange={(v: any) => setLayout(v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona disposición" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vertical">Vertical (Columna)</SelectItem>
                                    <SelectItem value="horizontal">Horizontal (Fila)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Colors */}
                        <div className="space-y-3 pt-2 border-t">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Colores por Estado</Label>

                            <div className="grid grid-cols-1 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Caducada</Label>
                                    <Select value={colors.overdue} onValueChange={(v) => handleColorChange('overdue', v)}>
                                        <SelectTrigger className="h-8">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded-full border ${colors.overdue.split(' ')[0]}`} />
                                                <SelectValue />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {colorOptions.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full border ${opt.value.split(' ')[0]}`} />
                                                        {opt.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Para mañana</Label>
                                    <Select value={colors.tomorrow} onValueChange={(v) => handleColorChange('tomorrow', v)}>
                                        <SelectTrigger className="h-8">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded-full border ${colors.tomorrow.split(' ')[0]}`} />
                                                <SelectValue />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {colorOptions.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full border ${opt.value.split(' ')[0]}`} />
                                                        {opt.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Menos de 1 semana</Label>
                                    <Select value={colors.upcoming} onValueChange={(v) => handleColorChange('upcoming', v)}>
                                        <SelectTrigger className="h-8">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded-full border ${colors.upcoming.split(' ')[0]}`} />
                                                <SelectValue />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {colorOptions.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full border ${opt.value.split(' ')[0]}`} />
                                                        {opt.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Más de 1 semana</Label>
                                    <Select value={colors.future} onValueChange={(v) => handleColorChange('future', v)}>
                                        <SelectTrigger className="h-8">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded-full border ${colors.future.split(' ')[0]}`} />
                                                <SelectValue />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {colorOptions.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full border ${opt.value.split(' ')[0]}`} />
                                                        {opt.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
