import axios from "axios";

export async function getTheWeatherOfCity(args: unknown) {
  const cityname = typeof args === "string" ? args : String(args ?? "");
  if (!cityname) return "Error: cityname is required";
  try {
    const { data } = await axios.get(
      `https://wttr.in/${encodeURIComponent(cityname.toLowerCase())}?format=%C+%t`,
      { responseType: "text", timeout: 10_000 },
    );
    return `The Weather of ${cityname} is ${data}`;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return `Error fetching weather: ${msg}`;
  }
}
