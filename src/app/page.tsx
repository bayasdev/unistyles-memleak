import { connection } from "next/server";
import { ReproScreen } from "./ReproScreen";

export default async function Home() {
  await connection();

  return <ReproScreen requestedAt={new Date().toISOString()} />;
}
