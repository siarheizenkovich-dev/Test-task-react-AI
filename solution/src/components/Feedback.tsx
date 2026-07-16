export const LoadingState = ({ label = 'Loading…' }: { label?: string }) => (
  <p className="feedback">{label}</p>
);

export const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) => (
  <div className="feedback">
    <p className="error">{message}</p>
    {onRetry && <button onClick={onRetry}>Try again</button>}
  </div>
);

export const EmptyState = ({ message }: { message: string }) => (
  <p className="feedback">{message}</p>
);
