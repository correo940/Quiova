'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SPANISH_REGIONS } from '@/lib/holidays';
import { Settings, MapPin } from 'lucide-react';

interface HolidaySettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRegionChange: (region: string) => void;
}

export default function HolidaySettingsDialog({ open, onOpenChange, onRegionChange }: HolidaySettingsDialogProps) {
    const [selectedRegion, setSelectedRegion] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('holiday_region_es');
        if (saved) setSelectedRegion(saved);
    }, []);

    const handleSave = () => {
        if (selectedRegion) {
            localStorage.setItem('holiday_region_es', selectedRegion);
            onRegionChange(selectedRegion);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Configurar Festivos
                    </DialogTitle>
                    <DialogDescription>
                        Selecciona tu Comunidad Autónoma para ver los festivos locales en el calendario.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <label className="text-sm font-medium mb-2 block">Comunidad Autónoma</label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona una región" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Solo Nacionales</SelectItem>
                            {SPANISH_REGIONS.map(region => (
                                <SelectItem key={region.code} value={region.code}>
                                    {region.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Preferencia</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
