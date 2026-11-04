export function respondToMessage(message: string): string {
  const text = message.toLocaleLowerCase("es");
  if (
    /\b(dolor|síntom\w*|diagnóst\w*|medic\w*|pastill\w*|enfermedad|embaraz\w*|terap\w*|ansiedad|depres\w*|autoles\w*|suicid\w*|pánico|remedio|dosis|receta|prescrib\w*)\b/iu.test(
      text,
    )
  ) {
    return "No puedo evaluar síntomas ni orientar tratamientos. Para una consulta de salud, habla con un profesional cualificado. Si hay peligro inmediato, contacta los servicios de emergencia locales.";
  }
  if (/\b(ocupad\w*|trabaj\w*|tiempo|agenda|apuro)\b/iu.test(text)) {
    return "Tiene sentido que el tiempo influya. No asumiré qué necesitas: ¿te serviría elegir una versión de dos minutos, cambiar el momento o dejarlo para otro día?";
  }
  if (/\b(cansad\w*|agotad\w*|energía|energia|difícil|dificil|no pude|fallé|falle)\b/iu.test(text)) {
    return "Gracias por contármelo. No es un fallo. ¿Qué pesó más esta vez: el tiempo, la energía, acordarte u otra cosa? Puedes cambiar el plan o no cambiarlo.";
  }
  return "Gracias por compartirlo. ¿Qué versión pequeña y realista te gustaría probar, si es que quieres probar alguna?";
}
