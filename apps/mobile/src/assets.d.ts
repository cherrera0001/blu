// Metro resuelve imports de imágenes a un id de asset numérico.
declare module "*.png" {
  const asset: number;
  export default asset;
}
