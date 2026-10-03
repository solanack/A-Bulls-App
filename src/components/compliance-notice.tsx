/** Visible Void Glass disclaimer. Text is always in the document, never a hover-only tooltip. */
export function ComplianceNotice({ text, className = "" }: { text: string; className?: string }) {
  const value = text.trim();
  if (!value) return null;
  return (
    <p className={className ? `compliance-notice ${className}` : "compliance-notice"} data-compliance-notice="">
      {value}
    </p>
  );
}
