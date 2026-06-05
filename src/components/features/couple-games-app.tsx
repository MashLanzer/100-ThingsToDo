"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft } from "lucide-react"

// ── Static game data (fallback local — full pool served by /api/games/question) ──

const VERDADES_PAREJAS: string[] = [
  "¿Cuál es tu recuerdo favorito de nuestra relación hasta ahora?",
  "¿En qué momento supiste que yo era especial para ti?",
  "¿Qué es lo primero que pensaste cuando me viste por primera vez?",
  "¿Qué es lo que más te gusta de mí?",
  "¿Cuál ha sido tu momento más vergonzoso conmigo?",
  "¿Qué es lo que nunca me has contado pero querías hacerlo?",
  "¿Qué canción te recuerda a mí y por qué?",
  "¿Cuál es la cosa más ridícula que has hecho por amor?",
  "¿Si pudieras cambiar algo de nuestra relación, qué sería?",
  "¿Qué sueño tienes que aún no le has contado a nadie?",
  "¿Qué es lo que más te pone nervioso/a de mí?",
  "¿Cuál es el recuerdo de nuestra primera cita que más te hace reír?",
  "¿Qué 3 palabras usarías para describir nuestra relación?",
  "¿Qué cosa te da más vergüenza admitir que te gusta?",
  "¿En qué momento has sido más feliz en tu vida?",
  "¿Qué es lo que más extrañas de tu infancia?",
  "¿Qué es lo que te hace sentir amado/a de verdad?",
  "¿Cuál es tu plan perfecto para una cita romántica?",
  "¿Qué es lo que más te cuesta pedir perdón?",
  "¿Cuál es tu mayor miedo y cómo lo llevas?",
  "¿Qué harías si solo te quedara un día de vida?",
  "¿Qué mensaje me enviarías si supieras que es el último?",
  "¿Si pudieras volver atrás en el tiempo, qué momento vivirías de nuevo?",
  "¿Qué promesa quieres que nos hagamos hoy?",
  "¿En qué momento has sentido más orgullo de ti mismo/a?",
  "¿Qué hábito tuyo crees que a mí más me cuesta tolerar?",
  "¿Qué es lo que más admiras de mí?",
  "¿Hay algo que hayas querido preguntarme y no te hayas atrevido?",
  "¿Cuándo fue la última vez que lloraste y por qué?",
  "¿Qué significa para ti que sigamos juntos dentro de 10 años?",
  "¿Qué persona (además de mí) ha marcado más tu vida?",
  "¿Cuál es tu peor manía o hábito?",
  "¿Qué película o serie me recomendarías para entenderme mejor?",
  "¿Qué es lo que más te tranquiliza cuando estás estresado/a?",
  "¿Qué harías con un millón de euros?",
  "¿Cuál es tu mayor arrepentimiento?",
  "¿Qué superpower elegirías si pudieras tener uno?",
  "¿Si pudieras vivir en cualquier ciudad del mundo, cuál elegirías y por qué?",
  "¿Cuál es tu tipo de vejez ideal?",
  "¿Cuándo fue la primera vez que te sentiste verdaderamente enamorado/a?",
  "¿Qué es lo que más valoras en una persona?",
  "¿Cuál es el cumplido que nunca olvidarás?",
  "¿Qué cosa tuya crees que me sorprendería si la descubriera?",
  "¿Cuál es tu forma favorita de demostrar que quieres a alguien?",
  "¿Hay algo que sientas que nunca entenderé de ti?",
  "¿Qué es lo que más te cuesta en una relación?",
  "¿Qué es lo que más te gusta de ti mismo/a?",
  "¿A qué persona famosa te gustaría parecerte y por qué?",
  "¿Cuál es la decisión más difícil que has tomado en tu vida?",
  "¿Qué es lo que te hace único/a?",
  "¿Qué es lo que te gustaría que la gente dijera de ti cuando no estás?",
  "¿Cuándo te sentiste más solo/a en tu vida?",
  "¿Cuál es la mentira más grande que has dicho?",
  "¿Qué harías diferente si pudieras vivir tu adolescencia de nuevo?",
  "¿Qué es lo que más te ha enseñado nuestra relación?",
  "¿Qué es lo que más te gusta de cómo te trato?",
  "¿Cuál es tu miedo más irracional?",
  "¿Qué es lo que te hace reír hasta llorar?",
  "¿Cuál es el momento más romántico que has vivido?",
  "¿Cuál es la conversación más importante que hemos tenido?",
  "¿Qué cosa de mí te enamoró sin que te dieras cuenta?",
  "¿Cuántos hijos te gustaría tener o no tener, y por qué?",
  "¿Cuál es tu recuerdo más feliz de la infancia?",
  "¿Qué es lo que más te gusta de cómo nos llevamos?",
  "¿Cuál sería tu lugar perfecto para vivir juntos?",
  "¿Cuál es la aventura que más te gustaría vivir conmigo?",
  "¿Qué es lo que nunca renunciarías por nadie?",
  "¿Cuándo sentiste que de verdad me conocías?",
  "¿Qué es lo que más disfrutas de pasar tiempo conmigo?",
  "¿Cuál es tu mayor logro personal hasta ahora?",
  "¿Qué cosa pequeña hago que te alegra el día sin que yo lo sepa?",
  "¿Qué hobby secreto tienes o te gustaría tener?",
  "¿Cuándo fue la última vez que hiciste algo por primera vez?",
  "¿Qué es lo que más extrañarías de mí si no estuviera?",
  "¿Cuándo sentiste que nuestra relación dio un salto importante?",
  "¿Qué cosa de ti mismo/a llevas más tiempo intentando mejorar?",
  "¿Cuál es la tradición familiar que más quieres mantener?",
  "¿Qué canción pondría la banda sonora de tu vida ahora mismo?",
  "¿Qué es lo que más te cuesta decirme?",
  "¿Cuál sería tu último deseo si pudieras pedir uno?",
  "¿Qué cosa me dirías si supieras que no te voy a juzgar?",
]

const RETOS_PAREJAS: string[] = [
  "Imita la voz de tu pareja durante 1 minuto",
  "Cuéntale a tu pareja algo que nunca le hayas dicho",
  "Da a tu pareja el masaje de espalda más increíble de su vida",
  "Baila una canción romántica durante 30 segundos sin parar",
  "Dibuja un retrato de tu pareja en solo 60 segundos",
  "Di 5 cosas que amas de tu pareja SIN repetirte",
  "Imita a tu pareja haciendo algo cotidiano hasta que adivine qué es",
  "Describe nuestra relación usando solo emojis",
  "Haz una pose de modelo durante 10 segundos sin reírte",
  "Dile algo cursi que normalmente no dirías",
  "Haz la actuación más dramática posible de 'te quiero'",
  "Explica en 60 segundos por qué te enamoraste de tu pareja",
  "Inventa una canción de 30 segundos sobre vuestra historia",
  "Recita un poema improvisado para tu pareja ahora mismo",
  "Muestra la foto más graciosa que tengas en tu teléfono",
  "Habla con acento diferente durante 2 minutos completos",
  "Escribe con el dedo un mensaje secreto en la espalda de tu pareja",
  "Declara tu amor en silencio, solo con gestos, durante 30 segundos",
  "Haz el gesto más ridículo que sepas hacer",
  "Di el alfabeto pero cada letra es una cosa que te gusta de tu pareja",
  "Silba tu canción favorita hasta que tu pareja la adivine",
  "Inventa un nombre para el equipo que formáis los dos y explica por qué",
  "Muestra tu cara de enfado más convincente durante 20 segundos",
  "Confiesa una mentira pequeña que le hayas dicho alguna vez",
  "Dile a tu pareja tres cosas que te gustaría que hiciera más seguido",
  "Enumera 10 cosas que os hagan reír a los dos",
  "Llama a alguien de tu familia y dile que lo quieres de parte de los dos",
  "Crea una frase de amor usando solo palabras de 3 letras",
  "Propón un plan sorpresa para el próximo fin de semana",
  "Cuenta en 1 minuto cómo sería vuestro día perfecto juntos",
  "Envíale un audio muy dramático a alguien de tu familia diciéndoles que los quieres",
  "Describe nuestra relación como si fuera la sinopsis de una película",
  "Di 10 cosas que admiras de tu pareja sin repetir nada",
  "Haz el chiste más malo que sepas y no te rías",
  "Pon una canción que os represente como pareja y explica por qué",
  "Imita al personaje de tu película favorita durante 30 segundos",
  "Comparte el meme más gracioso que tengas guardado",
  "Haz 10 flexiones o sentadillas ahora mismo",
  "Di tres cosas que harías diferente si tuvieras que enamorarte de cero",
  "Imita a un famoso/a que le guste a tu pareja",
  "Cuéntale la historia de cómo os conocisteis con todos los detalles dramáticos",
  "Haz una foto artística de lo que tengas más cerca ahora mismo",
  "Escribe en papel la lista de las 5 cosas que más amas de tu pareja y dásela",
  "Di el nombre de tu pareja con 5 acentos diferentes",
  "Inventa un eslogan para vuestra pareja como si fueran una marca",
  "Canta los primeros 30 segundos de vuestra canción favorita",
  "Haz una parodia de cómo me comporto cuando estoy enfadado/a",
  "Cuenta un secreto tonto que nunca le hayas contado a nadie",
  "Haz el baile más ridículo que conozcas durante 15 segundos",
  "Di tres cosas que quieres que hagamos juntos antes de que acabe el año",
  "Recrea la escena más romántica de tu película favorita",
  "Describe a tu pareja como si fuera un plato de restaurante con estrellas Michelin",
  "Muéstrame cómo bailarías si estuvieras solo/a en casa",
  "Llora de forma teatral durante 20 segundos sin motivo",
  "Inventa tres apodos nuevos para tu pareja ahora mismo",
  "Haz una declaración de amor usando solo palabras que empiecen por la misma letra",
  "Convence a tu pareja en 30 segundos de que eres la mejor persona del mundo",
  "Cuéntame tu primer recuerdo de mí con todo lujo de detalles",
  "Actúa como si fueras el protagonista de una telenovela durante 1 minuto",
  "Haz una lista de 5 tradiciones nuevas que quieres empezar con tu pareja",
  "Imita cómo habla tu pareja por teléfono",
  "Describe nuestra primera cita como si fuera un anuncio de televisión",
  "Crea un brindis especial para vosotros ahora mismo",
  "Haz el ruido de 5 animales diferentes en menos de 20 segundos",
  "Di tres cosas que nunca te cansarías de hacer con tu pareja",
  "Escenifica cómo pedirías matrimonio sin palabras",
  "Inventa un chiste sobre vuestra relación que sea tan malo que sea bueno",
  "Haz una reverencia real como si tu pareja fuera la realeza",
  "Cuéntame tu sueño más raro que recuerdes",
  "Di en voz alta qué es lo que más te gusta del físico de tu pareja",
  "Imita a tu pareja cuando le hablas a las mascotas o a los bebés",
  "Propón un viaje improvisado para el próximo mes con destino sorpresa",
  "Explica por qué eres la mejor pareja del mundo en exactamente 10 palabras",
  "Recita los votos de boda más cursis que puedas imaginar",
  "Cuéntame la historia de nuestra relación al revés, desde hoy hasta el principio",
  "Diseña con mímica el logo de vuestra pareja",
  "Haz la voz de un presentador de concurso y presenta a tu pareja al público",
  "Toca con el dedo el ritmo de una canción hasta que tu pareja la adivine",
  "Di tres cosas que te dan miedo admitir que te gustan",
  "Cuenta en 60 segundos por qué vuestra historia merece una película",
  "Haz la imitación de tu pareja cuando está nervioso/a",
]

const VERDADES_NEUTRAL: string[] = [
  "¿Cuál es tu mayor talento oculto?",
  "¿Qué harías si supieras que no puedes fracasar?",
  "¿Cuál es la cosa más estúpida que has hecho por quedar bien?",
  "¿Qué es lo que más te arrepientes de no haber hecho?",
  "¿Cuántas veces has fingido entender algo que no entendías?",
  "¿Cuál es el insulto más creativo que has usado?",
  "¿Qué opinas realmente de las redes sociales?",
  "¿Qué personaje de serie o película crees que eres en la vida real?",
  "¿Cuál es el cotilleo más jugoso que sabes y no has contado?",
  "¿Qué harías diferente si pudieras vivir el último año de nuevo?",
  "¿Cuál es tu opinión más impopular?",
  "¿Cuál es la peor excusa que has puesto para no salir?",
  "¿Qué es lo que más te cuesta hacer por vergüenza?",
  "¿Cuál es tu mayor vicio inconfesable?",
  "¿Qué es lo más ridículo en lo que has gastado dinero?",
  "¿Cuál es la cosa más impulsiva que has hecho en tu vida?",
  "¿A quién le has mentido más recientemente y por qué?",
  "¿Qué es lo que más te da pereza hacer aunque sabes que deberías?",
  "¿Qué es lo que más envidias de alguien que conoces?",
  "¿Cuál ha sido tu mayor malentendido con alguien?",
  "¿Qué es lo primero que haces al despertar que no admitirías públicamente?",
  "¿Cuántas veces revisas el teléfono en una hora?",
  "¿Cuál es la canción más vergonzosa que tienes en tu lista de reproducción?",
  "¿Qué es lo más raro que comes o comes de forma rara?",
  "¿Cuál es la excusa más creativa que has inventado para no hacer algo?",
  "¿Qué es lo que más te molesta de la gente aunque no lo dices?",
  "¿Cuál es la peor actuación que has dado en tu vida?",
  "¿Qué es lo que más tiempo procrastinas?",
  "¿Cuál ha sido tu mayor vergüenza en público?",
  "¿Qué ley cambiarías si pudieras?",
  "¿Qué aplicación del móvil usas más de lo que admitirías?",
  "¿Cuál es la comida que comes a escondidas porque te da vergüenza que gusta?",
  "¿Cuál es tu recuerdo más embarazoso del colegio?",
  "¿Qué es lo que dices que odias pero en realidad disfrutas en secreto?",
  "¿Cuál es el reto que llevas años posponiendo?",
  "¿Qué harías si supieras que nadie te va a ver durante 24 horas?",
  "¿Cuál es la cosa más absurda que te ha dado miedo?",
  "¿Qué momento de tu vida cambiarías aunque nadie lo notara?",
  "¿Cuál es el comentario más hiriente que has recibido y que no puedes olvidar?",
  "¿Qué hábito saludable intentas adoptar y que siempre abandonas?",
  "¿Qué es lo más infantil que sigues haciendo?",
  "¿Cuál es la pregunta que más miedo te da que te hagan?",
  "¿Qué es lo que más te cuesta perdonar?",
  "¿Cuántas notificaciones no leídas tienes ahora mismo?",
  "¿Qué es lo que más te cuesta decirle a alguien a la cara?",
  "¿Cuál es la situación social que más te agota?",
  "¿Cuál es la serie que llevas empezada meses sin terminar?",
  "¿Qué es lo más raro que has buscado en internet?",
  "¿Cuál es tu fobia más irracional?",
  "¿Qué es lo primero en lo que te fijas cuando conoces a alguien?",
  "¿Cuántas horas a la semana sientes que has perdido el tiempo de verdad?",
  "¿Cuál es tu opinión sobre las reuniones de trabajo o estudio?",
  "¿Cuál es la mentira más creativa que has contado?",
  "¿Qué es lo que más te cuesta admitir que no sabes hacer?",
  "¿Cuál es el cumpleaños más importante que has olvidado?",
  "¿Cuál es el consejo que das pero que tú mismo/a no sigues?",
  "¿Qué es lo que más te da vergüenza de ti mismo/a?",
  "¿Cuál es el plan que más veces has cancelado en el último año?",
  "¿Qué es lo que más tardas en decidir?",
  "¿Qué es lo más caro que has comprado por impulso y de lo que te arrepientes?",
  "¿Cuándo fue la última vez que te equivocaste claramente y lo admitiste?",
  "¿Cuál es la creencia que tenías de pequeño/a que hoy te parece absurda?",
  "¿Qué harías si encontraras 500€ en la calle?",
  "¿Cuál es el mayor riesgo que has tomado en tu vida?",
  "¿Qué cosa tuya sabes que irrita a los demás aunque no te lo digan?",
  "¿Cuál es tu mayor inseguridad cuando estás en grupo?",
  "¿Qué harías si tuvieras poderes durante un solo día?",
  "¿Qué película o serie te ha hecho llorar y niegas haberlo hecho?",
  "¿Qué es lo más generoso que has hecho sin que nadie lo sepa?",
  "¿Cuánto tiempo llevas pensando en hacer algo que aún no has empezado?",
  "¿Cuál es el comentario que guardas para ti pero que casi sueltas?",
  "¿Cuándo fue la última vez que hiciste algo que te daba miedo?",
  "¿Cuál es tu debilidad más conocida entre tus amigos?",
  "¿Cuál es la experiencia más fuera de tu zona de confort que has vivido?",
  "¿Qué cambiarías de ti mismo/a con un clic si pudieras?",
  "¿Cuál es el momento en que más has sentido que te has superado?",
  "¿Qué cosa de ti mismo/a llevas más tiempo intentando mejorar?",
  "¿Cuánto tiempo llevas sin leer un libro completo?",
  "¿Cuál fue la última decisión que tomaste sin pensar y que resultó ser la mejor?",
  "¿Qué harías si tuvieras un día libre sin responsabilidades absolutamente ninguna?",
  "¿Cuál es la cosa más cara que has roto y no lo has contado?",
]

const RETOS_NEUTRAL: string[] = [
  "Habla durante 1 minuto completo sin decir 'eeeh' ni 'mmm'",
  "Imita a un famoso/a hasta que alguien adivine de quién se trata",
  "Di el trabalenguas más largo que sepas sin equivocarte",
  "Haz la coreografía de un anuncio de televisión que todos conozcan",
  "Describe un color sin nombrarlo ni decir a qué objetos se asocia",
  "Convence al grupo de que eres un robot durante 2 minutos",
  "Haz una parodia de un presentador del tiempo con lo que ves por la ventana",
  "Di en 30 segundos todos los países de Europa que recuerdes",
  "Actúa como si estuvieras en una película de acción durante 1 minuto",
  "Haz el ruido de 5 animales sin repetirte",
  "Cuenta un chiste tan malo que provoque silencio incómodo",
  "Describe tu película favorita sin decir el título y que el grupo la adivine",
  "Haz mímica de un oficio o profesión hasta que alguien lo adivine",
  "Di el abecedario al revés en menos de 30 segundos",
  "Habla en otro idioma (o inventado) durante 1 minuto sin parar",
  "Representa una escena de película de terror sin sonido",
  "Haz de comentarista deportivo de algo mundano como servirse agua",
  "Imita cómo camina alguien del grupo hasta que adivinen quién es",
  "Canta una canción sustituyendo todas las vocales por la 'e'",
  "Haz el monólogo de un político inventado durante 45 segundos",
  "Da un discurso apasionado a favor de algo completamente absurdo",
  "Dibuja un autorretrato con los ojos cerrados",
  "Haz la cara de 5 emociones diferentes en 10 segundos cada una",
  "Describe un objeto de la habitación como si fuera una joya de museo",
  "Inventa el tráiler de una película con el peor título posible",
  "Convence al grupo de comprar algo completamente inútil",
  "Haz que el grupo se ría en menos de 30 segundos",
  "Inventa un refrán nuevo que suene antiguo y sabio",
  "Di 10 palabras en inglés mientras alguien cuenta hasta 10",
  "Haz una coreografía de 30 segundos con la canción que te pongan",
  "Explica cómo funciona internet a alguien de 80 años en 1 minuto",
  "Haz que parezca que estás hablando por teléfono con el presidente",
  "Describe tu día de hoy como si fuera una épica aventura medieval",
  "Di un piropo inventado y creativo a alguien del grupo",
  "Haz que el grupo adivine una película solo con sonidos",
  "Inventa un trabalenguas nuevo en este momento",
  "Explica qué es un smartphone a alguien de la antigüedad",
  "Haz de chef estrella explicando cómo preparas un bocadillo",
  "Convierte una noticia aburrida en algo emocionante en 45 segundos",
  "Haz una entrevista de trabajo a alguien del grupo para un trabajo absurdo",
  "Sé el presentador de un programa de teletienda con un objeto de la sala",
  "Imita el sonido de una tormenta usando solo partes de tu cuerpo",
  "Da un discurso de agradecimiento por ganar un Oscar por lavarte los dientes",
  "Convierte una receta de cocina en una canción de reggaeton",
  "Recita un poema espontáneo sobre el sofá o la silla en la que estás",
  "Haz de árbitro de un partido de fútbol de lo que sea que esté pasando",
  "Inventa tres nombres de productos de farmacia que suenen reales",
  "Haz mímica de un momento vergonzoso sin decir lo que es",
  "Explica cómo sobrevivir en una isla desierta con lo que tienes en los bolsillos",
  "Di 15 palabras que rimen con 'amor' en menos de 20 segundos",
  "Actúa como si el suelo fuera lava durante 30 segundos",
  "Haz de guía turístico de la habitación en la que estáis",
  "Cuenta tu día de hoy como si fuera un capítulo de serie de suspense",
  "Haz que alguien del grupo se ría sin hacerle cosquillas",
  "Inventa un superpoder inútil y explica para qué serviría",
  "Habla durante 30 segundos sin usar la letra 'a'",
  "Di en qué película serías el primero en morir y por qué",
  "Actúa como si fueras el villano de una película de Disney durante 1 minuto",
  "Haz la voz de un locutor de radio de los años 80 hablando de lo que quieras",
  "Inventa un producto de limpieza con nombre en latín y explica sus beneficios",
  "Crea el jingle publicitario de algo que no se puede anunciar",
  "Haz de embajador/a de un país imaginario y da un discurso",
  "Describe tu almuerzo de hoy como si fuera un plato de alta cocina",
  "Actúa como si fueras un robot que acaba de descubrir las emociones",
  "Inventa tres leyes absurdas que mejorarían el mundo",
  "Haz la parodia de un tutorial de YouTube sobre algo que no sabes hacer",
  "Di los meses del año pero en orden alfabético",
  "Inventa el nombre de una banda de música y el título de su primer álbum",
  "Da instrucciones para hacer algo cotidiano como si fuera un manual de IKEA",
  "Imita cómo explica algo una persona cuando no tiene ni idea del tema",
  "Inventa una leyenda urbana sobre el lugar donde estáis ahora",
  "Haz de periodista entrevistando a la persona más aburrida del mundo",
  "Haz el doblaje de un documental sobre alguien del grupo",
  "Inventa tres emojis que deberían existir y no existen",
  "Explica la teoría de la relatividad usando solo monosílabos",
  "Di 10 onomatopeyas distintas en 15 segundos",
  "Inventa un trabalenguas con el nombre de alguien del grupo",
  "Haz de crítico literario describiendo el último mensaje que mandaste por WhatsApp",
  "Di el discurso más emocionante posible sobre por qué el agua es el mejor invento",
  "Imita a tres famosos en menos de 1 minuto",
  "Haz de detective investigando por qué hay un calcetín en el suelo",
  "Inventa una excusa brillante para llegar tarde que nadie haya usado nunca",
  "Recita los planetas del sistema solar de memoria en orden",
  "Cuenta hasta 30 alternando con otra persona sin que ninguno falle",
]

interface Dilemma { a: string; b: string }
const QUE_PREFIERES: Dilemma[] = [
  { a: "Vivir en la ciudad", b: "Vivir en el campo" },
  { a: "Ser famoso/a sin dinero", b: "Ser rico/a pero anónimo/a" },
  { a: "Viaje a la playa", b: "Viaje a la montaña" },
  { a: "Netflix toda la noche", b: "Cenar fuera y pasear" },
  { a: "Desayuno romántico en casa", b: "Brunch en un café bonito" },
  { a: "Fin de semana solos", b: "Fin de semana con amigos" },
  { a: "Saber el futuro", b: "Poder cambiar el pasado" },
  { a: "Hablar por teléfono", b: "Chatear por mensajes" },
  { a: "Frío con buena ropa", b: "Calor en verano" },
  { a: "Película de terror", b: "Película romántica" },
  { a: "Cocinar en casa", b: "Pedir a domicilio" },
  { a: "Madrugar y disfrutar la mañana", b: "Trasnochar y dormir hasta tarde" },
  { a: "Muchos amigos conocidos", b: "Pocos amigos muy íntimos" },
  { a: "Viajar mucho con lo justo", b: "Viajar poco pero con lujo" },
  { a: "Recordarlo todo perfectamente", b: "Olvidar fácilmente lo malo" },
  { a: "Verano perfecto en el Caribe", b: "Invierno mágico en el norte de Europa" },
  { a: "Vivir 100 años con salud normal", b: "Vivir 70 años con salud perfecta" },
  { a: "Sorpresa romántica inesperada", b: "Cita planificada y especial" },
  { a: "Perder el teléfono", b: "Perder la cartera" },
  { a: "Un abrazo largo sin decir nada", b: "Una conversación profunda de horas" },
  { a: "Canción lenta y romántica", b: "Canción movida y alegre" },
  { a: "Primera cita en cine", b: "Primera cita en restaurante" },
  { a: "Tener mascota juntos", b: "Sin mascotas pero viajar más" },
  { a: "Boda pequeña e íntima", b: "Boda grande con toda la familia" },
  { a: "Leer libros", b: "Ver documentales" },
  { a: "Conocer el futuro de vuestra relación", b: "No saber nada y vivirlo juntos" },
  { a: "Dormir con la ventana abierta", b: "Cuarto muy caliente y cerrado" },
  { a: "Ganar la pelea pero perder la razón", b: "Tener razón pero perder la pelea" },
  { a: "Comprar regalos pensados con tiempo", b: "Hacer un regalo sorpresa espontáneo" },
  { a: "Mudarte al extranjero juntos", b: "Quedarse en vuestra ciudad siempre" },
  { a: "Despertarse con el sol", b: "Dormir con las persianas cerradas" },
  { a: "Road trip sin plan fijo", b: "Viaje organizado al milímetro" },
  { a: "Casa propia pequeña y acogedora", b: "Piso grande de alquiler en el centro" },
  { a: "Un perro enorme", b: "Un gato independiente" },
  { a: "Pasar las fiestas en casa", b: "Escapada de Navidad a otro país" },
  { a: "Trabajo que adoras con poco sueldo", b: "Trabajo aburrido con mucho dinero" },
  { a: "Hablar de los problemas enseguida", b: "Esperar a calmarse antes de hablar" },
  { a: "Música en casa siempre puesta", b: "Silencio y tranquilidad en casa" },
  { a: "Pedir perdón primero aunque no tengas razón", b: "Esperar a que la otra persona dé el paso" },
  { a: "Pasar el domingo viendo series", b: "Pasar el domingo al aire libre" },
  { a: "Regalar experiencias (cenas, viajes)", b: "Regalar objetos pensados con cariño" },
  { a: "Vivir cerca de la familia", b: "Vivir lejos y veros en vacaciones" },
  { a: "Cocinar juntos en casa", b: "Descubrir restaurantes nuevos cada semana" },
  { a: "Gym y ejercicio regular", b: "Actividades al aire libre y senderismo" },
  { a: "Saber exactamente lo que hay en vuestra cuenta", b: "Dejarlo fluir sin agobios económicos" },
  { a: "Película en el cine", b: "Película en casa con palomitas" },
  { a: "Hablar todos los días aunque sea poco", b: "Hablar menos pero con conversaciones largas" },
  { a: "Fin de año en una gran ciudad", b: "Fin de año en un pueblo tranquilo" },
  { a: "Comprar una casa juntos", b: "Ahorrar para viajar el mundo antes" },
  { a: "Pasar tiempo de calidad a diario", b: "Tener espacio propio y quedar cuando apetezca" },
  { a: "Serie larga y adictiva", b: "Película de dos horas y ya" },
  { a: "Foto para el recuerdo en cada sitio", b: "Vivir el momento sin sacar el teléfono" },
  { a: "Conocer a muchos amigos nuevos", b: "Profundizar con los que ya tienes" },
  { a: "Cambiarte de ciudad cada pocos años", b: "Echar raíces en un solo lugar" },
  { a: "Decirte lo que pienso aunque duela", b: "Protegerte de cosas que te harían daño" },
  { a: "Compartir las redes sociales con tu pareja", b: "Tener perfiles totalmente privados" },
  { a: "Que nos conozcan como pareja en todas partes", b: "Tener vuestra intimidad para vosotros solos" },
  { a: "Pasar las vacaciones explorando", b: "Pasar las vacaciones sin hacer nada en absoluto" },
  { a: "Levantarte pronto y aprovechar el día", b: "Dormir hasta tarde y empezar despacio" },
  { a: "Bricolaje y decorar la casa juntos", b: "Contratar a alguien y disfrutar del resultado" },
  { a: "Ver el partido juntos", b: "Ir al estadio aunque haga frío" },
  { a: "Un secreto que solo sepa tu pareja", b: "Ser completamente transparente con todos" },
  { a: "Vivir junto al mar", b: "Vivir en la montaña con nieve en invierno" },
  { a: "Que tus amigos sean también los suyos", b: "Tener cada uno su propio círculo de amigos" },
  { a: "Celebrar los aniversarios a lo grande", b: "Celebrarlos de forma íntima y especial" },
]

const PREGUNTAS_36 = [
  // Set 1
  { set: 1 as const, text: "Si pudieras elegir a cualquier persona en el mundo como invitado a cenar, ¿a quién elegirías?" },
  { set: 1 as const, text: "¿Te gustaría ser famoso/a? ¿De qué manera?" },
  { set: 1 as const, text: "Antes de hacer una llamada telefónica, ¿ensayas lo que vas a decir? ¿Por qué?" },
  { set: 1 as const, text: "¿Cómo sería para ti un día perfecto?" },
  { set: 1 as const, text: "¿Cuándo fue la última vez que cantaste para ti mismo/a? ¿Y para alguien más?" },
  { set: 1 as const, text: "Si pudieras vivir hasta los 90 años manteniendo la mente o el cuerpo de los 30 durante los últimos 60 años, ¿qué elegirías?" },
  { set: 1 as const, text: "¿Tienes una corazonada secreta sobre cómo vas a morir?" },
  { set: 1 as const, text: "Nombra tres cosas que tú y yo tengamos en común" },
  { set: 1 as const, text: "¿Por qué estás más agradecido/a en tu vida?" },
  { set: 1 as const, text: "Si pudieras cambiar algo de la forma en que te criaron, ¿qué sería?" },
  { set: 1 as const, text: "Cuéntame tu historia de vida con el mayor detalle posible en cuatro minutos" },
  { set: 1 as const, text: "Si pudieras despertar mañana habiendo ganado cualquier cualidad o habilidad, ¿cuál sería?" },
  // Set 2
  { set: 2 as const, text: "Si una bola de cristal te dijera la verdad sobre ti mismo/a, tu vida o el futuro, ¿qué querrías saber?" },
  { set: 2 as const, text: "¿Hay algo que hayas soñado hacer durante mucho tiempo? ¿Por qué no lo has hecho?" },
  { set: 2 as const, text: "¿Cuál es el mayor logro de tu vida?" },
  { set: 2 as const, text: "¿Qué valoras más en una amistad?" },
  { set: 2 as const, text: "¿Cuál es tu recuerdo más preciado?" },
  { set: 2 as const, text: "¿Cuál es tu recuerdo más doloroso?" },
  { set: 2 as const, text: "Si supieras que en un año vas a morir repentinamente, ¿cambiarías algo en tu vida? ¿Por qué?" },
  { set: 2 as const, text: "¿Qué significa la amistad para ti?" },
  { set: 2 as const, text: "¿Qué papel juegan el amor y el afecto en tu vida?" },
  { set: 2 as const, text: "Alternad compartiendo cinco características positivas de vuestra pareja" },
  { set: 2 as const, text: "¿Qué tan cálida y amorosa es tu familia? ¿Crees que tu infancia fue más feliz que la de la mayoría?" },
  { set: 2 as const, text: "¿Cómo te sientes con respecto a tu relación con tu madre?" },
  // Set 3
  { set: 3 as const, text: "Haz tres afirmaciones verídicas del tipo 'nosotros dos...'" },
  { set: 3 as const, text: "Completa esta frase: 'Ojalá tuviera alguien con quien compartir...'" },
  { set: 3 as const, text: "Si fueras a ser amigo/a íntimo/a de tu pareja, ¿qué sería importante que supiera de ti?" },
  { set: 3 as const, text: "Cuéntale a tu pareja lo que más te gusta de él/ella. Sé muy honesto/a." },
  { set: 3 as const, text: "Comparte con tu pareja un momento embarazoso de tu vida" },
  { set: 3 as const, text: "¿Cuándo fue la última vez que lloraste delante de alguien? ¿Y solo/a?" },
  { set: 3 as const, text: "Cuéntale a tu pareja algo que ya te guste de él/ella" },
  { set: 3 as const, text: "¿Hay algo que sea demasiado serio como para bromear?" },
  { set: 3 as const, text: "Si fueras a morir esta noche sin poder comunicarte con nadie, ¿qué lamentarías no haber dicho? ¿Por qué no lo has dicho todavía?" },
  { set: 3 as const, text: "Tu casa está en llamas. Después de salvar a tus seres queridos, tienes tiempo de salvar solo una cosa material. ¿Qué sería y por qué?" },
  { set: 3 as const, text: "De todas las personas de tu familia, ¿cuya pérdida te resultaría más difícil? ¿Por qué?" },
  { set: 3 as const, text: "Comparte un problema personal y pide consejo a tu pareja. Cuéntale también cómo te sientes al respecto." },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onBack: () => void }
type View = "home" | "verdad-reto" | "prefieres" | "36-preguntas"
type VorMode = "verdad" | "reto"

const MODES = [
  { id: "verdad-reto" as View,   emoji: "🎴", name: "Verdad o Reto",    desc: "Preguntas íntimas y retos divertidos", color: "#7c3aed" },
  { id: "prefieres" as View,     emoji: "⚖️", name: "¿Qué prefieres?",  desc: "Dilemas para conocerse mejor",         color: "#0369a1" },
  { id: "36-preguntas" as View,  emoji: "💬", name: "36 Preguntas",     desc: "El estudio que une corazones",         color: "#b45309" },
]

export function CoupleGamesApp({ onBack }: Props) {
  const [view, setView] = useState<View>("home")

  // — Verdad o Reto —
  const [vorMode, setVorMode] = useState<VorMode>("verdad")
  const [vorCategory, setVorCategory] = useState<"parejas" | "neutral">("parejas")
  const [verdades, setVerdades] = useState<string[]>([])
  const [retos, setRetos] = useState<string[]>([])
  const [vIdx, setVIdx] = useState(0)
  const [rIdx, setRIdx] = useState(0)
  const [vorFlipped, setVorFlipped] = useState(false)
  const [vorLoading, setVorLoading] = useState(false)

  // — ¿Qué prefieres? —
  const [dilemmas, setDilemmas] = useState<Dilemma[]>([])
  const [dIdx, setDIdx] = useState(0)
  const [dChoice, setDChoice] = useState<"a" | "b" | null>(null)

  // — 36 Preguntas —
  const [q36Idx, setQ36Idx] = useState(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("games_36_idx") ?? "0", 10)
    }
    return 0
  })

  async function loadVorQuestions(cat: "parejas" | "neutral" = vorCategory) {
    setVorLoading(true)
    const fbVerdades = cat === "neutral" ? VERDADES_NEUTRAL : VERDADES_PAREJAS
    const fbRetos    = cat === "neutral" ? RETOS_NEUTRAL    : RETOS_PAREJAS
    try {
      const [tRes, dRes] = await Promise.all([
        fetch(`/api/games/question?type=truth&category=${cat}&count=25`),
        fetch(`/api/games/question?type=dare&category=${cat}&count=25`),
      ])
      const tData = tRes.ok ? await tRes.json() : null
      const dData = dRes.ok ? await dRes.json() : null
      setVerdades(tData?.questions?.length ? tData.questions : shuffled(fbVerdades))
      setRetos(dData?.questions?.length ? dData.questions : shuffled(fbRetos))
    } catch {
      setVerdades(shuffled(fbVerdades))
      setRetos(shuffled(fbRetos))
    } finally {
      setVorLoading(false)
    }
  }

  const enterGame = useCallback((v: View) => {
    if (v === "verdad-reto") {
      setVIdx(0); setRIdx(0)
      setVorMode("verdad"); setVorFlipped(false)
      loadVorQuestions("parejas")
    } else if (v === "prefieres") {
      setDilemmas(shuffled(QUE_PREFIERES))
      setDIdx(0); setDChoice(null)
    }
    setView(v)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("games_36_idx", String(q36Idx))
    }
  }, [q36Idx])

  // — Derived —
  const currentVerdad = verdades[vIdx % Math.max(verdades.length, 1)]
  const currentReto   = retos[rIdx % Math.max(retos.length, 1)]
  const currentCard   = vorMode === "verdad" ? currentVerdad : currentReto
  const currentDilemma = dilemmas[dIdx] ?? QUE_PREFIERES[0]
  const currentQ36    = PREGUNTAS_36[Math.min(q36Idx, PREGUNTAS_36.length - 1)]
  const q36Progress   = Math.min(q36Idx + 1, 36)
  const q36Set        = currentQ36?.set ?? 1

  // ── Render helpers ────────────────────────────────────────────────────────

  const chipStyle = (active: boolean, color: string) => ({
    padding: "0.4rem 1rem", borderRadius: "999px", border: `2px solid ${active ? color : "var(--border)"}`,
    background: active ? color : "transparent", color: active ? "white" : "var(--foreground-muted)",
    fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer", fontFamily: "inherit",
    transition: "all 0.15s ease",
  } as React.CSSProperties)

  const backBtn = (label: string) => (
    <button
      onClick={() => setView("home")}
      style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", fontWeight: 600, fontSize: "0.8125rem", padding: "0.25rem 0", fontFamily: "inherit", marginBottom: "0.75rem" }}
    >
      <ChevronLeft size={16} /> {label}
    </button>
  )

  // ── Views ─────────────────────────────────────────────────────────────────

  if (view === "home") {
    return (
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", fontWeight: 600, fontSize: "0.8125rem", padding: "0.25rem 0", fontFamily: "inherit", marginBottom: "0.5rem" }}>
          <ChevronLeft size={16} /> Inicio
        </button>
        <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.25rem" }}>
          🎮 Juegos de Pareja
        </h2>
        <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginBottom: "1.25rem" }}>
          Para conectar, reír y conocerse más
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => enterGame(m.id)}
              style={{
                display: "flex", alignItems: "center", gap: "1rem",
                padding: "1rem 1.125rem", borderRadius: "16px",
                background: `linear-gradient(135deg, ${m.color}18 0%, ${m.color}08 100%)`,
                border: `1.5px solid ${m.color}30`,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                transition: "transform 0.12s ease, box-shadow 0.12s ease",
              }}
            >
              <span style={{ fontSize: "2rem", lineHeight: 1, flexShrink: 0 }}>{m.emoji}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)", margin: 0 }}>{m.name}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", margin: 0, marginTop: "0.125rem" }}>{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Verdad o Reto ─────────────────────────────────────────────────────────

  if (view === "verdad-reto") {
    const isVerdad = vorMode === "verdad"
    const cardBg = isVerdad
      ? "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
      : "linear-gradient(135deg, #ea580c 0%, #f97316 100%)"

    return (
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {backBtn("Juegos")}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
          <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            🎴 Verdad o Reto
          </h3>
          {!vorLoading && (
            <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: vorCategory === "neutral" ? "#0369a1" : "#7c3aed", background: vorCategory === "neutral" ? "#dbeafe" : "#ede9fe", borderRadius: "999px", padding: "2px 7px", letterSpacing: "0.04em" }}>
              {verdades.length + retos.length} preguntas
            </span>
          )}
        </div>

        {/* Category switch */}
        <div style={{ display: "flex", background: "var(--muted)", borderRadius: "999px", padding: "3px", marginBottom: "0.625rem", gap: "2px" }}>
          {(["parejas", "neutral"] as const).map((cat) => {
            const active = vorCategory === cat
            return (
              <button
                key={cat}
                disabled={vorLoading}
                onClick={() => {
                  if (cat === vorCategory) return
                  setVorCategory(cat)
                  setVIdx(0); setRIdx(0); setVorFlipped(false)
                  loadVorQuestions(cat)
                }}
                style={{
                  flex: 1, padding: "0.3rem 0", borderRadius: "999px", border: "none",
                  background: active ? (cat === "parejas" ? "#7c3aed" : "#0369a1") : "transparent",
                  color: active ? "white" : "var(--foreground-muted)",
                  fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.18s ease",
                }}
              >
                {cat === "parejas" ? "🧡 Parejas" : "😂 Neutral"}
              </button>
            )
          })}
        </div>

        {/* Mode selector */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <button style={chipStyle(isVerdad, "#7c3aed")} onClick={() => { setVorMode("verdad"); setVorFlipped(false) }}>
            💬 Verdad
          </button>
          <button style={chipStyle(!isVerdad, "#ea580c")} onClick={() => { setVorMode("reto"); setVorFlipped(false) }}>
            🎯 Reto
          </button>
        </div>

        {/* Card */}
        <div style={{
          flex: 1, borderRadius: "20px", background: cardBg, padding: "1.5rem",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)", marginBottom: "1rem", position: "relative", overflow: "hidden",
        }}>
          <div aria-hidden style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <div aria-hidden style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          {vorLoading ? (
            <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.8)", textAlign: "center" }}>Cargando preguntas...</p>
          ) : (
            <>
              <p style={{ fontSize: "2.5rem", marginBottom: "1rem", lineHeight: 1 }}>
                {isVerdad ? "💬" : "🎯"}
              </p>
              <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "rgba(255,255,255,0.75)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {isVerdad ? "Verdad" : "Reto"}
              </p>
              <p style={{ fontSize: "1rem", fontWeight: 600, color: "white", textAlign: "center", lineHeight: 1.45, position: "relative", zIndex: 1 }}>
                {currentCard}
              </p>
            </>
          )}
        </div>

        {/* Next button */}
        <button
          disabled={vorLoading}
          onClick={() => {
            if (isVerdad) setVIdx(i => (i + 1) % Math.max(verdades.length, 1))
            else setRIdx(i => (i + 1) % Math.max(retos.length, 1))
          }}
          style={{
            padding: "0.75rem", borderRadius: "14px", border: "none",
            cursor: vorLoading ? "default" : "pointer",
            background: isVerdad ? "#7c3aed" : "#ea580c", color: "white",
            fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            opacity: vorLoading ? 0.6 : 1,
          }}
        >
          Siguiente →
        </button>
      </div>
    )
  }

  // ── ¿Qué prefieres? ───────────────────────────────────────────────────────

  if (view === "prefieres") {
    return (
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {backBtn("Juegos")}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
          <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            ⚖️ ¿Qué prefieres?
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", fontWeight: 600 }}>
            {dIdx + 1} / {dilemmas.length}
          </span>
        </div>

        <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginBottom: "1rem" }}>
          Cada uno elige en voz alta. ¡Sin pensar mucho!
        </p>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
          {(["a", "b"] as const).map((opt) => {
            const selected = dChoice === opt
            const text = opt === "a" ? currentDilemma.a : currentDilemma.b
            const label = opt === "a" ? "A" : "B"
            const color = opt === "a" ? "#0369a1" : "#7c3aed"
            return (
              <button
                key={opt}
                onClick={() => setDChoice(opt)}
                style={{
                  flex: 1, padding: "1rem", borderRadius: "16px", border: `2px solid ${selected ? color : "var(--border)"}`,
                  background: selected ? `${color}15` : "var(--card)",
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  transition: "all 0.15s ease",
                  boxShadow: selected ? `0 4px 16px ${color}25` : "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: "50%", background: selected ? color : "var(--border)",
                  color: selected ? "white" : "var(--foreground-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: "0.875rem", flexShrink: 0,
                  transition: "all 0.15s ease",
                }}>
                  {label}
                </span>
                <span style={{ fontWeight: 600, fontSize: "0.875rem", color: selected ? color : "var(--foreground)", lineHeight: 1.35 }}>
                  {text}
                </span>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => { setDIdx(i => (i + 1) % dilemmas.length); setDChoice(null) }}
          style={{
            padding: "0.75rem", borderRadius: "14px", border: "none", cursor: "pointer",
            background: "#0369a1", color: "white",
            fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          Siguiente →
        </button>
      </div>
    )
  }

  // ── 36 Preguntas ──────────────────────────────────────────────────────────

  if (view === "36-preguntas") {
    const finished = q36Idx >= PREGUNTAS_36.length
    const setColors: Record<number, string> = { 1: "#b45309", 2: "#0369a1", 3: "#7c3aed" }
    const setColor = setColors[q36Set] ?? "#b45309"
    const setLabel = `Ronda ${q36Set} de 3`

    return (
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {backBtn("Juegos")}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
          <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            💬 36 Preguntas
          </h3>
          {!finished && (
            <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", fontWeight: 600 }}>
              {q36Progress} / 36
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: "999px", background: "var(--border)", overflow: "hidden", marginBottom: "0.875rem" }}>
          <div style={{ height: "100%", width: `${(q36Progress / 36) * 100}%`, borderRadius: "999px", background: setColor, transition: "width 0.3s ease" }} />
        </div>

        {finished ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "3rem" }}>🎉</span>
            <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "var(--foreground)", margin: 0, textAlign: "center" }}>
              ¡Habéis completado las 36 preguntas!
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", textAlign: "center", margin: 0 }}>
              Según el estudio, responder juntos estas preguntas fortalece el vínculo de pareja. ¡Enhorabuena!
            </p>
            <button
              onClick={() => setQ36Idx(0)}
              style={{ marginTop: "0.5rem", padding: "0.625rem 1.25rem", borderRadius: "12px", border: "none", cursor: "pointer", background: "#7c3aed", color: "white", fontWeight: 700, fontSize: "0.875rem", fontFamily: "inherit" }}
            >
              Empezar de nuevo
            </button>
          </div>
        ) : (
          <>
            <div style={{
              flex: 1, borderRadius: "20px", padding: "1.25rem",
              background: `linear-gradient(135deg, ${setColor}18 0%, ${setColor}08 100%)`,
              border: `1.5px solid ${setColor}30`,
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              marginBottom: "1rem",
            }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: setColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {setLabel}
              </span>
              <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--foreground)", lineHeight: 1.5, margin: "1rem 0" }}>
                {currentQ36.text}
              </p>
              <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", margin: 0 }}>
                Turnarse para responder. Tomad vuestro tiempo.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              {q36Idx > 0 && (
                <button
                  onClick={() => setQ36Idx(i => i - 1)}
                  style={{ padding: "0.75rem", borderRadius: "14px", border: "1.5px solid var(--border)", cursor: "pointer", background: "var(--card)", color: "var(--foreground)", fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit", flex: "0 0 auto" }}
                >
                  ←
                </button>
              )}
              <button
                onClick={() => setQ36Idx(i => Math.min(i + 1, PREGUNTAS_36.length))}
                style={{
                  flex: 1, padding: "0.75rem", borderRadius: "14px", border: "none", cursor: "pointer",
                  background: setColor, color: "white",
                  fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                }}
              >
                Siguiente →
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return null
}
