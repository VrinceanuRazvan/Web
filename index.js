const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;

const obGlobal = {
  obErori: null
};

// 12. Se va crea o variabilă globală numită obGlobal de tip obiect.
// 11. Se va crea o funcție, numită initErori(), care citește JSON-ul cu erorile și creează un obiect corespunător lui cu toate datele erorilor.
function initErori() {
  const continut = fs.readFileSync(path.join(__dirname, "resurse/json/erori.json")).toString("utf-8");

  obGlobal.obErori = JSON.parse(continut);
  for (let eroare of obGlobal.obErori.info_erori) {
    eroare.imagine = path.join(obGlobal.obErori.cale_baza, eroare.imagine);
  }
}

initErori();

app.set('view engine', 'ejs');
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// 13. Se va crea o funcție de afișare a erorilor, numită afisareEroare(), care va primi un obiect de tip Response.
function afisareEroare(res, identificator, titlu, text, imagine) {
  const eroare = obGlobal.obErori.info_erori.find(e => e.identificator == identificator);
  const defaultEroare = obGlobal.obErori.eroare_default;

  const eroareRandata = {
    titlu: titlu || (eroare ? eroare.titlu : defaultEroare.titlu),
    text: text || (eroare ? eroare.text : defaultEroare.text),
    imagine: imagine || (eroare ? eroare.imagine : defaultEroare.imagine)
  };

  const status = typeof identificator === 'number' ? identificator : 500;
  res.status(status).render('pagini/eroare', eroareRandata, (err, html) => {
    if (err) {
      console.error(err);
      res.status(500).send("Eroare la randarea paginii de eroare");
    } else {
      res.send(html);
    }
  });
}

// 3. Afișarea căii folderului și fișierului
console.log(`Calea folderului: ${__dirname}`);
console.log(`Calea fișierului: ${__filename}`);
console.log(`Folderul curent de lucru: ${process.cwd()}`);
console.log(`Sunt __dirname și process.cwd() aceleași? ${__dirname === process.cwd()}`);

// 6. Se va defini în program acest folder ca fiind static
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// 9. Se va declara un app.get() general pentru calea "/*", care tratează orice cerere de forma /pagina
app.get(['/', '/index', '/home'], (req, res) => {
  res.render('pagini/index', { titlu: 'Pagina Principală' }, (err, html) => {
    if (err) {
      if (err.message.startsWith('Failed to lookup view')) {
        afisareEroare(res, 404);
      } else {
        afisareEroare(res, 500);
      }
    } else {
      res.send(html);
    }
  });
});

// 17. La o cerere către o cale din /resurse fără fișier specificat, returnăm eroarea 403 Forbidden
app.get('/resurse/*', (req, res) => {
  afisareEroare(res, 403);
});

// 19. La cererea oricărui fișier cu extensia ejs, transmitem o eroare de tip 400 Bad Request
app.get('/*.ejs', (req, res) => {
  afisareEroare(res, 400);
});

// 9. Se va declara un app.get() general pentru calea "/*"
app.get('/*', (req, res) => {
  const pagina = req.params[0];
  res.render(`pagini/${pagina}`, { titlu: pagina }, (err, html) => {
    if (err) {
      if (err.message.startsWith('Failed to lookup view')) {
        afisareEroare(res, 404);
      } else {
        afisareEroare(res, 500);
      }
    } else {
      res.send(html);
    }
  });
});

// 18. Adăugarea unui app.get() pentru "/favicon.ico"
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'resurse', 'favicon', 'favicon.ico'));
});

// Middleware pentru tratarea erorilor
app.use((err, req, res, next) => {
  const status = err.status || 500;
  afisareEroare(res, status, err.message);
});

// 20. Crearea unui vector cu numele folderelor de creat și verificarea lor
const vect_foldere = ['temp'];

vect_foldere.forEach(folder => {
  const folderPath = path.join(__dirname, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
});

app.listen(PORT, () => {
  console.log(`Serverul rulează pe http://localhost:${PORT}`);
});
