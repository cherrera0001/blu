import BluApp from "./BluApp";
import { SkipLink } from "./SkipLink";

export default function Page() {
  return (
    <>
      <SkipLink />
      <main id="contenido-principal">
        <BluApp />
      </main>
    </>
  );
}
