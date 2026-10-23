"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel p-8">
      <h1 className="display text-5xl">Something broke.</h1>
      <p className="mt-3 text-muted">{error.message}</p>
      <button className="btn mt-5" onClick={reset}>Try again</button>
    </div>
  );
}
