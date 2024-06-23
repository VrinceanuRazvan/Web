const express = require('express');
const path = require('path');
const fs = require('fs');
const sass = require('sass');

const app = express();
const PORT = 8080;

const obGlobal = {
  obErori: null,
  obGalerie: null,
  folderScss: path.join(__dirname, 'resurse/scss'),
  folderCss: path.join(__dirname, 'resurse/css')
};

// Funcția de compilare SCSS
function compileazaScss(caleScss, caleCss) {
  if (!path.isAbsolute(caleScss))
    caleScss = path.join(obGlobal.folderScss, caleScss);
  if (!path.isAbsolute(caleCss))
    caleCss = path.join(obGlobal.folderCss, caleCss);

  const backupPath = path.join(__dirname, 'backup', 'css');
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }

  const timestamp = new Date().getTime();
  const cssBackup = path.join(backupPath, `${path.basename(caleCss, '.css')}_${timestamp}.css`);

  if (fs.existsSync(caleCss)) {
    fs.copyFileSync(caleCss, cssBackup);
  }

  try {
    const result = sass.renderSync({ file: caleScss });
    fs.writeFileSync(caleCss, result.css, (err) => {
      if (err) console.error(`Error writing CSS file: ${err}`);
    });
    console.log(`Successfully compiled ${caleScss} to ${caleCss}`);
  } catch (error) {
    console.error(`Error compiling SCSS: ${error.message}`);
  }
}

// Compilare inițială la pornirea serverului
fs.readdirSync(obGlobal.folderScss).forEach(file => {
  if (path.extname(file) === '.scss') {
    compileazaScss(file, file.replace('.scss', '.css'));
  }
});

// Watch pentru modificări în fișierele SCSS
fs.watch(obGlobal.folderScss, (eventType, filename) => {
  if (path.extname(filename) === '.scss') {
    compileazaScss(filename, filename.replace('.scss', '.css'));
  }
});

// Inițializare erori și galerie
function initErori() {
  const continut = fs.readFileSync(path.join(__dirname, "resurse/json/erori.json")).toString("utf-8");
  obGlobal.obErori = JSON.parse(continut);
  for (let eroare of obGlobal.obErori.info_erori) {
    eroare.imagine = path.join(obGlobal.obErori.cale_baza, eroare.imagine);
  }
}

function initGalerie() {
  const continut = fs.readFileSync(path.join(__dirname, "resurse/json/galerie.json")).toString("utf-8");
  obGlobal.obGalerie = JSON.parse(continut);
}

function getImaginiForToday() {
  const zile = ["duminica", "luni", "marti", "miercuri", "joi", "vineri", "sambata"];
  const today = zile[new Date().getDay()];
  return obGlobal.obGalerie.imagini.filter(img => 
    img.intervale_zile.some(interval => 
      zile.slice(zile.indexOf(interval[0]), zile.indexOf(interval[1]) + 1).includes(today)
    )
  );
}

initErori();
initGalerie();

app.set('view engine', 'ejs');
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// Funcția de afișare erori
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
  const imaginiGalerie = getImaginiForToday();
  res.render('pagini/index', { titlu: 'Pagina Principală', imagini: imaginiGalerie, cale_galerie: obGlobal.obGalerie.cale_galerie }, (err, html) => {
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

app.get('/galerie', (req, res) => {
  const imaginiGalerie = getImaginiForToday();
  res.render('pagini/galerie', { titlu: 'Galerie', imagini: imaginiGalerie, cale_galerie: obGlobal.obGalerie.cale_galerie }, (err, html) => {
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

// Crearea folderelor backup și temp dacă nu există
const vect_foldere = ['temp', 'backup/css'];

vect_foldere.forEach(folder => {
  const folderPath = path.join(__dirname, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
});

app.listen(PORT, () => {
  console.log(`Serverul rulează pe http://localhost:${PORT}`);
});
