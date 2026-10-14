# Jaru Angelo D. Roces Personal Website

A responsive personal portfolio website built with HTML, CSS, and JavaScript. The site presents Jaru Roces's profile, education, certifications, technical skills, and project status.

## Features

- Responsive dark layout with desktop and mobile navigation
- Interactive profile maze: a minimalist maze with shortcuts and routes that favor short distances and fewer turns; the dot starts at a random edge or corner and travels to one of four exits, where it fades out; it bounces off the profile photo, and its trail fades before a new search begins
- Portfolio sections for About, Resume, and Projects
- Education, certifications, and technical skills in the resume
- Social media and email links
- Dynamic copyright year

## Project structure

- `index.html` — page structure, content, and scripts
- `css/nav-style.css` — stylesheet loaded by the page for navigation and layout
- `css/style.css` — alternate component styles, not currently loaded by the page
- `script.js` — interactive profile maze solver
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
- Change the active colors, spacing, typography, and layout in `css/nav-style.css`.
- Replace images in `images/` while keeping the same file names or update their references in `index.html`.
- Adjust the portfolio content, certifications, and project links in the relevant sections of `index.html`.

## Deployment

Upload the project files to any static hosting provider, such as GitHub Pages, Netlify, or Vercel. Ensure all local asset paths remain relative to the deployed website root.

## License

This project is provided for personal and educational use. Contact the owner before reusing or distributing the content for commercial purposes.
