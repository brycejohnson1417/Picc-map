'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface BudgetTrackerProps {
    googleGeocodingHits: number;
    budgetLimit: number;
}

export function BudgetTracker({ googleGeocodingHits, budgetLimit }: BudgetTrackerProps) {
    // $0.005 per Google Geocoding hit
    const estimatedBill = (googleGeocodingHits * 0.005).toFixed(2);
    const maxBill = (budgetLimit * 0.005).toFixed(2);
    const percentage = Math.min((googleGeocodingHits / budgetLimit) * 100, 100);

    const isNearingLimit = percentage > 80;
    const isCapped = percentage >= 100;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>API Budget Tracker</span>
                    <span className={`text-sm ${isCapped ? 'text-red-500' : isNearingLimit ? 'text-amber-500' : 'text-emerald-500'}`}>
                        ${estimatedBill} / ${maxBill}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                        <span>Google Geocoding Service (${0.005}/hit)</span>
                        <span>{googleGeocodingHits.toLocaleString()} / {budgetLimit.toLocaleString()} Hits</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                            className={`h-full transition-all duration-500 ${isCapped ? 'bg-red-500' : isNearingLimit ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>

                {isCapped && (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                        <strong>Budget Capped:</strong> The $100 monthly limit for Google Maps Geocoding has been reached. New Notion addresses will safely skip spatial resolution until the limit resets.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
