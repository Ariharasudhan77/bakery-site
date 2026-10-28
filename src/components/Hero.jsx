import OvenBoard from './OvenBoard';

export default function Hero() {
  return (
    <div className="hero" id="top">
      <div className="wrap">
        <div>
          <h1>Baked before the sun is up.</h1>
          <p className="lead">Small-batch bread, pastry and cakes, made by hand every morning and gone by evening.</p>
          <div className="btns">
            <a className="btn main" href="#menu">See the menu</a>
            <a className="btn" href="#order">Order ahead</a>
          </div>
        </div>
        <OvenBoard />
      </div>
    </div>
  );
}
