"use client";

export default function LabTechReportsPage() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Published Reports</h2>
      <p className="text-muted-foreground">
        A log of all finalized lab reports sent to doctors. Reports are published from the{" "}
        <strong>Test Requests</strong> page after entering results.
      </p>
    </div>
  );
}
