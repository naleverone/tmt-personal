# Bolt AI TMT

Este proyecto es una aplicación web desarrollada con Vite, React y TypeScript, utilizando Tailwind CSS para los estilos. Incluye un servidor JSON local para simular una API REST durante el desarrollo y utiliza Supabase para autenticación y persistencia de datos en producción.

## Descripción General y Funcionalidades

Bolt AI TMT es una plataforma de gestión de tareas para cadenas de tiendas, con enfoque en la administración, seguimiento y control de tareas asignadas a empleados y supervisores. El sistema permite a los administradores gestionar usuarios y tiendas, y a los supervisores y empleados visualizar y actualizar el estado de las tareas.

### Roles de Usuario
- **Admin**: Acceso total. Puede crear, editar y eliminar usuarios y tiendas, ver todas las tareas y acceder a paneles de administración.
- **Supervisor**: Puede ver y gestionar tareas de su tienda, crear nuevas tareas, y acceder a la vista general de su tienda.
- **Empleado**: Solo puede ver y actualizar el estado de sus tareas asignadas.

### Principales Funcionalidades
- **Autenticación y registro de usuarios** (con Supabase Auth).
- **Gestión de tareas**:
  - Listado de tareas con filtros por estado, prioridad, usuario asignado y tienda.
  - Creación de tareas (con opciones de recurrencia: diaria, semanal, mensual).
  - Visualización de detalles de tarea y subida de evidencias.
  - Cambio de estado de tareas (Pendiente/OK).
  - Vistas de tareas: tabla, tarjetas (grid) y calendario.
- **Panel de administración** (solo admin):
  - Gestión de usuarios (alta, edición, eliminación, asignación de roles y tiendas).
  - Gestión de tiendas (alta, edición, eliminación).
- **Vista de tienda** (supervisor/admin):
  - Resumen de tareas por tienda, con filtros y acceso rápido a detalles.
- **Dashboard**:
  - Gráficos de tareas por estado y tienda.
  - Resumen personalizado según el rol del usuario.
- **Cambio de contraseña** y cierre de sesión.

### Estructura de Navegación
- `/login` y `/register`: Autenticación y registro.
- `/`: Dashboard principal.
- `/tasks`: Listado de tareas (con filtros y vistas).
- `/tasks/new`: Creación de nueva tarea.
- `/tasks/:id`: Detalle de tarea.
- `/store`: Vista general de tienda (supervisor/admin).
- `/admin`: Panel de administración (usuarios y tiendas).

### Componentes y Páginas Clave
- **Sidebar**: Navegación lateral adaptada al rol del usuario.
- **TaskList**: Listado y gestión de tareas con múltiples vistas y filtros.
- **CreateTask**: Formulario avanzado para crear tareas, incluyendo recurrencia y asignación múltiple de tiendas.
- **TaskDetailContent**: Visualización y actualización de detalles y evidencias de una tarea.
- **AdminPanel, UsersPanel, StoresPanel**: Gestión de usuarios y tiendas.
- **StoreOverviewPage**: Resumen de tareas por tienda.
- **Modales**: Para edición, alta de usuarios, cambio de contraseña, etc.

### Datos y API
- **Supabase**: Autenticación y persistencia de datos en producción y desarrollo. Todas las operaciones de usuarios, tareas y tiendas se realizan directamente sobre la base de datos de Supabase mediante su API y cliente JS.

> **Nota:** Desde 2025, la aplicación utiliza exclusivamente Supabase para la gestión de datos y autenticación. El archivo `db.json` y `json-server` ya no son necesarios ni utilizados.

## Setup

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Configurar las variables de entorno de Supabase:

   Crea un archivo `.env` en la raíz del proyecto y agrega tus claves de Supabase:

   ```env
   VITE_SUPABASE_URL=tu_url_supabase
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   ```

3. Iniciar el servidor de desarrollo de Vite:

   ```bash
   npm run dev
   ```

   La aplicación estará disponible en la URL que imprime Vite (típicamente `http://localhost:5173`).

## Building for Production

Para crear un build optimizado de producción:

```bash
npm run build
```

Los archivos generados estarán en el directorio `dist`.

