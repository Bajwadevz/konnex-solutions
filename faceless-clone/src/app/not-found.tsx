import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel p-8">
      <h1 className="display text-5xl">That page is not on the board.</h1>
      <Link href="/" className="btn mt-5">Back to the studio</Link>
    </div>
  );
}
