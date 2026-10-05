import { redirect } from "next/navigation";
import { normalizeSignSlot } from "src/lib/roadSignCopy";

type Props = { searchParams: Promise<{ topic?: string }> };

export default async function Page({ searchParams }: Props) {
  const { topic } = await searchParams;
  redirect(`/road-signs?topic=${normalizeSignSlot(topic)}`);
}
