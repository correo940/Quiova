'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dumbbell, Battery, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SetupWizardProps {
    onComplete: (profile: any) => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [physicalLevel, setPhysicalLevel] = useState<string>('active');
    const [availability, setAvailability] = useState<string>('medium');

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const { data, error } = await supabase
                .from('smart_scheduler_profiles')
                .insert({
                    id: user.id,
                    physical_level: physicalLevel,
                    availability_intensity: availability
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('Perfil configurado correctamente');
            onComplete(data);
        } catch (error: any) {
            console.error('Error saving profile:', error);
            toast.error('Error al guardar el perfil: ' + (error.message || error.details || JSON.stringify(error)));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex h-full w-full items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
            <Card className="w-full max-w-lg shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Bienvenido al Organizador Vital</CardTitle>
                    <CardDescription className="text-center">
                        Para empezar, necesitamos conocer un poco sobre tu ritmo de vida para adaptar tu agenda.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Physical Level Section */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <Dumbbell className="w-4 h-4" /> Nivel de Actividad Física
                        </Label>
                        <RadioGroup value={physicalLevel} onValueChange={setPhysicalLevel} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Label
                                htmlFor="sedentary"
                                className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all ${physicalLevel === 'sedentary' ? 'border-primary ring-2 ring-primary/20' : ''}`}
                            >
                                <RadioGroupItem value="sedentary" id="sedentary" className="sr-only" />
                                <span className="mb-2 text-2xl">🧘</span>
                                <span className="font-medium">Sedentario</span>
                            </Label>
                            <Label
                                htmlFor="active"
                                className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all ${physicalLevel === 'active' ? 'border-primary ring-2 ring-primary/20' : ''}`}
                            >
                                <RadioGroupItem value="active" id="active" className="sr-only" />
                                <span className="mb-2 text-2xl">🏃</span>
                                <span className="font-medium">Activo</span>
                            </Label>
                            <Label
                                htmlFor="athlete"
                                className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all ${physicalLevel === 'athlete' ? 'border-primary ring-2 ring-primary/20' : ''}`}
                            >
                                <RadioGroupItem value="athlete" id="athlete" className="sr-only" />
                                <span className="mb-2 text-2xl">🏋️</span>
                                <span className="font-medium">Atleta</span>
                            </Label>
                        </RadioGroup>
                    </div>

                    {/* Availability Section */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <Battery className="w-4 h-4" /> Intensidad de Agenda
                        </Label>
                        <RadioGroup value={availability} onValueChange={setAvailability} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Label
                                htmlFor="low"
                                className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all ${availability === 'low' ? 'border-primary ring-2 ring-primary/20' : ''}`}
                            >
                                <RadioGroupItem value="low" id="low" className="sr-only" />
                                <span className="mb-2 text-2xl">🍃</span>
                                <span className="font-medium">Relajada</span>
                            </Label>
                            <Label
                                htmlFor="medium"
                                className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all ${availability === 'medium' ? 'border-primary ring-2 ring-primary/20' : ''}`}
                            >
                                <RadioGroupItem value="medium" id="medium" className="sr-only" />
                                <span className="mb-2 text-2xl">⚖️</span>
                                <span className="font-medium">Media</span>
                            </Label>
                            <Label
                                htmlFor="high"
                                className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all ${availability === 'high' ? 'border-primary ring-2 ring-primary/20' : ''}`}
                            >
                                <RadioGroupItem value="high" id="high" className="sr-only" />
                                <span className="mb-2 text-2xl">⚡</span>
                                <span className="font-medium">Intensa</span>
                            </Label>
                        </RadioGroup>
                    </div>

                </CardContent>
                <CardFooter>
                    <Button className="w-full" size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                        Comenzar
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
