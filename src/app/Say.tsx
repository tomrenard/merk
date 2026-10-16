/**
 * Text in the language being learned. With `tr` (Darija), the Arabic script reads right to
 * left and its Latin spelling sits under it; without, it is plain German text.
 */
export function Say({ de, tr, className = "" }: { de: string; tr?: string; className?: string }) {
  if (!tr) return <span className={className}>{de}</span>;
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span dir="rtl" lang="ar-MA">
        {de}
      </span>
      <span className="text-[0.8em] font-semibold opacity-75">{tr}</span>
    </span>
  );
}
