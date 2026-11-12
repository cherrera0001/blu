import BluApp from "./BluApp";
import { getMemoryConfig } from "@/lib/memory/policy";
import { getV1Config } from "@/lib/v1/config";
import { SkipLink } from "./SkipLink";

export default function Page() {
  return (
    <>
      <SkipLink />
      <main id="contenido-principal">
        <BluApp memory={getMemoryConfig(getV1Config())} />
      </main>
    </>
  );
}
