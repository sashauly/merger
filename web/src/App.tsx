import init, { greet } from "./wasm/core_audio"

function App() {
  const handleClickHello = async () => {
    try {
      await init();

      greet();
    } catch (err) {
      console.error("Failed to load WASM engine boilerplate:", err);
    }
  }

  return (
    <>
      <h1>Слияние / Merger</h1>
      <button onClick={handleClickHello}>Hello from core_audio!</button>
    </>
  )
}

export default App
