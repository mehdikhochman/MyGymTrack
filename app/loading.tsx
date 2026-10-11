// Shown instantly while a page that was not prefetched loads.
export default function Loading() {
  return (
    <div aria-busy="true">
      <div className="skeleton title" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
