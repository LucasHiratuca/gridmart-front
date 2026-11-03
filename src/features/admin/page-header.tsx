export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  )
}
