import Link from "next/link";
import { counts } from "@/lib/review";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { due, newLeft } = await counts();
  return (
    <main className="mx-auto mt-16 flex max-w-xs flex-col gap-6 p-4 text-center">
      <h1 className="text-4xl font-semibold">merk</h1>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm opacity-60">Due</dt>
          <dd className="text-3xl text-sky-600">{due}</dd>
        </div>
        <div>
          <dt className="text-sm opacity-60">New today</dt>
          <dd className="text-3xl text-green-600">{newLeft}</dd>
        </div>
      </dl>
      <Link href="/review" className="btn btn-primary">
        {due + newLeft > 0 ? "Lernen" : "Review anyway"}
      </Link>
      <Link href="/settings" className="text-sm opacity-60">
        Settings
      </Link>
    </main>
  );
}
