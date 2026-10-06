# Jaru Angelo D. Roces Personal Website

A responsive personal portfolio website built with HTML, CSS, and vanilla JavaScript. The site presents information about Jaru Roces, including an about section, skills, certifications, gallery, projects, and contact links.

## Features

- Responsive layout for desktop, tablet, and mobile devices
- Sticky navigation with mobile menu
- Smooth scrolling and animated page elements
- Portfolio sections for about, gallery, skills, and projects
- Social media and email links
- Dynamic copyright year

## Project structure

- `index.html` — page structure and embedded site content
- `style.css` — shared site stylesheet
- `css/style.css`, `css/style2.css`, and `css/style3.css` — additional stylesheet variants
- `script.js` — JavaScript compatibility file
- `images/` — profile, gallery, icons, and other assets

## Run locally

Because this is a static website, you can open `index.html` directly in a browser or serve the project through a local web server.

### Using XAMPP

1. Copy the project folder into `xampp/htdocs/`.
2. Start Apache in the XAMPP Control Panel.
3. Open `http://localhost/Web/` in your browser.

### Using a local server

```bash
php -S localhost:8000
```

Then visit `http://localhost:8000`.

## Customize the website

- Update the profile name, biography, and social links in `index.html`.
- Change colors, spacing, typography, and layout in `style.css` or the stylesheet variants.
- Replace images in `images/` while keeping the same file names or update their references in `index.html`.
- Adjust the portfolio content, certifications, and project links in the relevant sections of `index.html`.

## Deployment

Upload the project files to any static hosting provider, such as GitHub Pages, Netlify, or Vercel. Ensure all local asset paths remain relative to the deployed website root.

## License

This project is provided for personal and educational use. Contact the owner before reusing or distributing the content for commercial purposes.

