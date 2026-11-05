import BluApp from "./BluApp";

export default function Page() {
  return (
    <>
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido principal
      </a>
      <main id="contenido-principal">
        <BluApp />
      </main>
    </>
  );
}
