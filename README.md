# Lisandro Bustos — Sistema de Rutinas

Generador automático de páginas de rutinas para alumnos.

---

## Cómo funciona

```
Actualizás el Excel  →  doble click en publicar.bat  →  copiás el link  →  lo enviás al alumno
```

El alumno abre el link en su celular y ve su rutina con registro semanal e historial.

---

## ⚙️ CONFIGURACIÓN INICIAL (una sola vez — ~15 minutos)

### Paso 1 — Instalar Node.js

1. Entrá a https://nodejs.org
2. Descargá la versión **LTS** (la recomendada)
3. Instalá normalmente (siguiente, siguiente, finalizar)
4. Para verificar: abrí la terminal y escribí `node --version` → tiene que aparecer algo como `v20.x.x`

---

### Paso 2 — Crear cuenta en GitHub

1. Entrá a https://github.com/signup
2. Creá tu cuenta gratuita
3. Una vez dentro, instalá **GitHub Desktop** (opcional pero recomendado): https://desktop.github.com

---

### Paso 3 — Subir este proyecto a GitHub

**Con GitHub Desktop (más fácil):**
1. Abrí GitHub Desktop → File → Add Local Repository
2. Seleccioná esta carpeta (`lisandro-training`)
3. Click en "Publish repository" → nombre: `lisandro-training` → **desmarcar** "Keep this code private" si querés que Netlify lo lea gratis
4. Click en "Publish repository"

**Con terminal:**
```bash
cd lisandro-training
git init
git add .
git commit -m "setup inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/lisandro-training.git
git push -u origin main
```

---

### Paso 4 — Configurar Netlify

1. Entrá a https://netlify.com → Sign up con tu cuenta de GitHub
2. Click en **"Add new site"** → **"Import an existing project"**
3. Elegí **GitHub** → autorizá → seleccioná el repositorio `lisandro-training`
4. En **"Publish directory"** escribí: `docs`
5. Click en **"Deploy site"**

Netlify te va a dar una URL como `https://nombre-random-123.netlify.app`

**Para personalizar la URL:**
- Site settings → Site information → Change site name
- Escribí: `lisandrobustos` (o lo que quieras)
- Tu URL queda: `https://lisandrobustos.netlify.app`

---

### Paso 5 — Actualizar la URL en generar.js

Abrí `generar.js` y en la línea 15 cambiá:
```js
baseUrl: 'https://lisandrobustos.netlify.app',  // ← tu URL de Netlify
```

---

## 📅 USO SEMANAL (2 minutos por alumno)

### 1. Actualizar el Excel

Abrí el archivo de tu alumno en `/alumnos/` (ej: `Agustina_Clavijo.xlsx`):
- Ir a la pestaña de la semana que corresponde (ej: `SEMANA_2`)
- Editar las celdas **amarillas** con las nuevas cargas
- Guardar el archivo

### 2. Publicar

Hacer **doble click** en `publicar.bat` (Windows) o `publicar.command` (Mac)

El script va a:
- Leer todos los Excel de la carpeta `/alumnos`
- Generar las páginas HTML con historial de semanas anteriores
- Hacer commit y push a GitHub
- Netlify publica automáticamente en ~30 segundos

### 3. Copiar y enviar el link

Al final del proceso aparecen los links listos:
```
  Agustina Clavijo
  https://lisandrobustos.netlify.app/agustina-clavijo

  Juan Pérez
  https://lisandrobustos.netlify.app/juan-perez
```

---

## 📁 Estructura del proyecto

```
lisandro-training/
  ├── 📄 publicar.bat         ← doble click (Windows)
  ├── 📄 publicar.command     ← doble click (Mac)
  ├── 📄 generar.js           ← el cerebro del sistema
  ├── 📄 netlify.toml         ← configuración de Netlify
  ├── 📄 package.json
  ├── 📁 alumnos/             ← tus Excel acá
  │     Agustina_Clavijo.xlsx
  │     Juan_Perez.xlsx
  └── 📁 docs/                ← páginas generadas (no tocar)
        agustina-clavijo/
          index.html
        juan-perez/
          index.html
```

---

## ➕ Agregar un nuevo alumno

1. Copiar `Agustina_Clavijo.xlsx` y renombrarlo (ej: `Juan_Perez.xlsx`)
2. En la pestaña `EJERCICIOS`, cambiar el nombre en la columna **Alumno**
3. Hacer lo mismo en todas las pestañas `SEMANA_N`
4. Cargar los ejercicios del nuevo alumno
5. Correr `publicar.bat` → el link nuevo aparece automáticamente

---

## 🗂️ Estructura del Excel

| Pestaña | Cuándo editarla | Qué contiene |
|---|---|---|
| `INSTRUCCIONES` | Solo leer | Guía de uso |
| `EJERCICIOS` | 1 vez por mes | Nombre, video, notas técnicas |
| `SEMANA_1` | Cada semana | Cargas, reps, series (celdas amarillas) |
| `SEMANA_2` | Cada semana | Ídem |
| `SEMANA_3` | Cada semana | Ídem |
| `SEMANA_4` | Cada semana | Ídem |

---

## ❓ Problemas frecuentes

**"git no es reconocido como comando"**
→ Instalá Git desde https://git-scm.com/download/win → reiniciá la terminal

**"npm install falla"**
→ Asegurate de que Node.js esté instalado. Cerrá y reabrí la terminal después de instalar.

**"El push falla con error de autenticación"**
→ Usá GitHub Desktop o configurá tu token de acceso personal en GitHub

**"Netlify no actualiza"**
→ Entrá a tu dashboard de Netlify → verificá que el último deploy fue exitoso
