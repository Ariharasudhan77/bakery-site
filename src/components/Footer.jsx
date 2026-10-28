

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="fgrid">
          <div>
            <div className="flogo">Pistachio <span>&amp;</span> Rye</div>
            <p>Small-batch bread, pastry and cakes, baked by hand every morning.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li><a href="#menu">Menu</a></li>
              <li><a href="#about">Our bakery</a></li>
              <li><a href="#order">Order ahead</a></li>
            </ul>
          </div>
          <div>
            <h4>Visit us</h4>
            <p>12 Baker Street, Your City</p>
            <p>Tue to Sun, 6:30 am to 8:00 pm</p>
            <p>Closed on Mondays</p>
          </div>
          <div>
            <h4>Get in touch</h4>
            <ul>
              <li><a href="tel:+910000000000">+91 00000 00000</a></li>
              <li><a href="mailto:hello@pistachioandrye.example">hello@pistachioandrye.example</a></li>
              <li><a href="#top">Instagram</a></li>
            </ul>
          </div>
        </div>
        <div className="fbottom">
          <span>© 2026 Pistachio &amp; Rye Bakery. All rights reserved.</span>
          <a href="#top" style={{ color: "inherit" }}>Back to top</a>
        </div>
      </div>
    </footer>
  );
}
