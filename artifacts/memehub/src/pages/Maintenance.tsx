import { Wrench, Clock } from "lucide-react";

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Wrench className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-3xl font-black mb-3">We'll be right back</h1>
      <p className="text-muted-foreground text-lg max-w-md mb-8">
        OVRHUB is currently undergoing scheduled maintenance. We're working hard to bring you a better experience.
      </p>
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full">
        <Clock className="w-4 h-4" />
        <span>Check back soon</span>
      </div>
    </div>
  );
}
