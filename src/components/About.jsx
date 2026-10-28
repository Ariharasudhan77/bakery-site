

export default function About() {
  return (
    <section className="about" id="about">
      <div className="wrap">
        <div>
          <h2 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", marginBottom: "1rem" }}>Flour, water, salt and patience.</h2>
          <p>We started in a home kitchen with one oven and a jar of sourdough starter. Today the starter is eight years old, the oven is bigger, and the recipe is still the same: slow fermentation, real butter, nothing added that you can’t pronounce.</p>
        </div>
        <div className="facts">
          <div className="fact"><b>Open 6:30 am to 8:00 pm</b>Closed on Mondays.</div>
          <div className="fact"><b>Order by 6 pm</b>Collect fresh the next morning.</div>
          <div className="fact"><b>Custom cakes</b>Give us three days’ notice.</div>
        </div>
      </div>
    </section>
  );
}
