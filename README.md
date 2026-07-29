# Consecutivo de Informes — Laboratorio de Materiales

Aplicación muy simple para asignar números consecutivos a informes de un
laboratorio. Cada usuario autorizado inicia sesión, toma el siguiente número
disponible, lo asigna a un proyecto con una descripción (máx. 255
caracteres), y el sistema guarda el registro (número + usuario + descripción
+ fecha) y aumenta el contador en 1 para el siguiente usuario.

No necesita base de datos externa: usa **Netlify Blobs**, que viene incluido
gratis en cualquier sitio de Netlify.

## Estructura del proyecto

```
├── netlify.toml              # Configuración de Netlify
├── package.json
├── netlify/functions/
│   ├── lib/auth.js            # Hash de contraseñas y tokens de sesión
│   ├── login.js                # POST /api/login
│   ├── assign-number.js        # POST /api/assign-number (requiere sesión)
│   ├── records.js              # GET  /api/records (requiere sesión)
│   └── admin-users.js          # Crear/listar/borrar usuarios (protegida con clave)
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```

## 1. Desplegar en Netlify

1. Sube esta carpeta a un repositorio de GitHub/GitLab (o arrastra la carpeta
   directamente en Netlify con "Deploy manually").
2. En Netlify: **Add new project → Import an existing project** y selecciona
   el repositorio. Netlify detecta automáticamente `netlify.toml`, no hace
   falta configurar nada más en el build.
3. Como ya tienes tu propio dominio/DNS, simplemente agrégalo en
   **Project configuration → Domain management** cuando el sitio esté
   desplegado.

## 2. Configurar las variables de entorno

En **Project configuration → Environment variables**, agrega:

| Variable        | Para qué sirve                                                             |
|-----------------|------------------------------------------------------------------------------|
| `JWT_SECRET`    | Clave secreta para firmar las sesiones de los usuarios. Usa un texto largo y aleatorio (ej. genera uno con `openssl rand -hex 32`). |
| `ADMIN_SECRET`  | Clave secreta para poder crear/borrar usuarios autorizados (ver paso 3). También usa un valor largo y aleatorio. |

Después de agregarlas, vuelve a desplegar el sitio (Netlify pide un
"redeploy" para que las funciones tomen las nuevas variables).

## 3. Crear los usuarios autorizados

La app no tiene pantalla de "crear cuenta" (por seguridad, para que no
cualquiera se registre). En su lugar, tú creas cada usuario autorizado con
una sola llamada a la función `admin-users`, usando la clave `ADMIN_SECRET`
que configuraste.

Puedes hacerlo con `curl` desde tu computadora, reemplazando los valores:

```bash
curl -X POST https://TU-SITIO.netlify.app/api/admin-users \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: TU_ADMIN_SECRET" \
  -d '{"username": "jperez", "password": "unaClaveSegura123", "name": "Juan Pérez"}'
```

Repite esto por cada usuario autorizado del laboratorio (cambiando
`username`, `password` y `name`).

Para ver la lista de usuarios creados:

```bash
curl https://TU-SITIO.netlify.app/api/admin-users \
  -H "x-admin-secret: TU_ADMIN_SECRET"
```

Para eliminar un usuario:

```bash
curl -X DELETE https://TU-SITIO.netlify.app/api/admin-users \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: TU_ADMIN_SECRET" \
  -d '{"username": "jperez"}'
```

> Guarda tu `ADMIN_SECRET` en un lugar seguro (no lo compartas con los
> usuarios del laboratorio); es la llave maestra para administrar cuentas.

## 4. Usar la aplicación

1. Cada usuario entra a tu dominio y hace login con su usuario/contraseña.
2. Escribe la descripción del proyecto (hasta 255 caracteres) y presiona
   **"Tomar y asignar número"**.
3. El sistema le muestra el número que le tocó, guarda el registro
   (número, usuario, descripción, fecha) y automáticamente deja listo el
   siguiente número consecutivo para quien lo pida después.
4. Debajo se ve el historial completo de números ya asignados.

## Cómo se evita que dos personas reciban el mismo número

Netlify Blobs no incrementa contadores de forma nativa, así que la función
`assign-number` hace una **escritura condicional** (optimista): lee el
contador actual, y solo lo actualiza si nadie más lo cambió mientras tanto;
si hubo una colisión (dos personas pidiendo número casi al mismo tiempo),
reintenta automáticamente con el valor correcto. Así nunca se repite ni se
salta un número.

## Notas

- Las contraseñas se guardan como hash (nunca en texto plano).
- Las sesiones expiran después de 8 horas; el usuario debe volver a
  iniciar sesión.
- Si quieres ver los datos crudos guardados, ve a
  **Project → Blobs** en el panel de Netlify: verás los stores
  `lab-registry` (contador y registros) y `lab-users` (usuarios).
