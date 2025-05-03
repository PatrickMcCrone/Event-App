import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = ({ className, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50',
        className
      )}
      {...props}
    />
  );
};

const CardHeader = ({ className, ...props }: CardProps) => {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  );
};

const CardTitle = ({ className, ...props }: CardProps) => {
  return (
    <h3
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
};

const CardDescription = ({ className, ...props }: CardProps) => {
  return (
    <p
      className={cn('text-sm text-slate-500 dark:text-slate-400', className)}
      {...props}
    />
  );
};

const CardContent = ({ className, ...props }: CardProps) => {
  return (
    <div className={cn('p-6 pt-0', className)} {...props} />
  );
};

export { Card, CardHeader, CardTitle, CardDescription, CardContent }; 