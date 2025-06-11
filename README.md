# Bolt AI TMT

Bolt AI TMT es una plataforma web para la gestión y seguimiento de tareas en cadenas de tiendas, diseñada para facilitar la administración, control y ejecución de actividades por parte de empleados, supervisores y administradores. El sistema está construido con tecnologías modernas y utiliza Supabase como backend principal para autenticación y persistencia de datos.

---

## Stack Tecnológico
- **Frontend:** React + Vite + TypeScript
- **Estilos:** Tailwind CSS
- **Backend as a Service:** Supabase (Base de datos PostgreSQL, Auth, Storage, API REST y Realtime)
- **Gráficos:** Chart.js (a través de react-chartjs-2)
- **Routing:** React Router
- **Gestión de estado y contexto:** React Context API
- **Despliegue sugerido:** Vercel, Netlify o cualquier hosting estático compatible

---

## Infraestructura y Arquitectura
- **Supabase** es el único backend: gestiona usuarios, roles, tareas y tiendas en una base de datos PostgreSQL, provee autenticación segura y almacenamiento de archivos (evidencias).
- **Frontend** completamente desacoplado, consume Supabase vía su cliente JS y API REST.
- **No se requiere servidor propio**: la app es serverless y puede desplegarse como SPA.
- **Variables de entorno**: la conexión a Supabase se configura mediante `.env` con las claves públicas del proyecto.

---

## Funcionalidades Principales

### 1. Autenticación y Seguridad
- Registro, login y logout de usuarios usando Supabase Auth.
- Recuperación y cambio de contraseña.
- Roles: `admin`, `supervisor`, `employee`.
- Protección de rutas según permisos.

### 2. Gestión de Tareas
- **Listado de tareas** con filtros avanzados (estado, prioridad, usuario, tienda).
- **Creación de tareas**:
  - Asignación a uno o varios usuarios y tiendas.
  - Opciones de recurrencia (diaria, semanal, mensual).
  - Definición de prioridad y fecha de vencimiento.
- **Detalle de tarea**:
  - Visualización completa de la información.
  - Subida y visualización de evidencias (archivos/fotos) usando Supabase Storage.
  - Cambio de estado (Pendiente/OK).
- **Vistas múltiples**: tabla, tarjetas (grid) y calendario.

### 3. Panel de Administración (solo admin)
- **Gestión de usuarios**:
  - Alta, edición y eliminación de usuarios.
  - Asignación de roles y tiendas.
- **Gestión de tiendas**:
  - Alta, edición y eliminación de tiendas.
- **Paneles y modales** para edición y confirmaciones.

### 4. Vista de Tienda (supervisor/admin)
- Resumen de tareas por tienda.
- Filtros por estado, prioridad y usuario.
- Acceso rápido a detalles y acciones.

### 5. Dashboard
- Gráficos de tareas por estado y tienda.
- Resumen personalizado según el rol del usuario.

### 6. Experiencia de Usuario
- Sidebar de navegación adaptada al rol.
- Modales para edición, alta de usuarios, cambio de contraseña, confirmaciones, etc.
- Mensajes de error y éxito claros.
- Responsive y usable en dispositivos móviles.

---

## Estructura de Navegación
- `/login` y `/register`: Autenticación y registro.
- `/`: Dashboard principal.
- `/tasks`: Listado de tareas (con filtros y vistas).
- `/tasks/new`: Creación de nueva tarea.
- `/tasks/:id`: Detalle de tarea.
- `/store`: Vista general de tienda (supervisor/admin).
- `/admin`: Panel de administración (usuarios y tiendas).

---

## Modelo de Datos (Supabase)

### Tabla: users
- **id** (uuid, PK): Identificador único del usuario.
- **auth_id** (uuid, único): ID de autenticación de Supabase Auth.
- **name** (text): Nombre completo del usuario.
- **email** (text, único): Correo electrónico.
- **role** (text): Rol del usuario (`admin`, `supervisor`, `employee`).
- **store_id** (uuid, FK, nullable): Tienda principal asociada (relación con `stores`).
- **created_at** (timestamp): Fecha de creación.

### Tabla: stores
- **id** (uuid, PK): Identificador único de la tienda.
- **name** (text): Nombre de la tienda.
- **external_id** (text, opcional): ID externo o referencia.
- **street_name** (text): Calle.
- **street_number** (text): Número.
- **additional_info** (text, opcional): Información adicional.
- **city** (text): Ciudad.
- **state** (text): Provincia/Estado.
- **created_at** (timestamp): Fecha de creación.

### Tabla: tasks
- **id** (uuid, PK): Identificador único de la tarea.
- **name** (text): Título o nombre de la tarea.
- **description** (text): Descripción detallada.
- **assigned_user_auth_id** (uuid, FK): Usuario asignado (relación con `users.auth_id`).
- **store_id** (uuid, FK): Tienda asociada (relación con `stores`).
- **due_date** (date): Fecha de vencimiento.
- **priority** (text): Prioridad (`Urgente`, `Rutinaria`, etc).
- **status** (text): Estado (`Pendiente`, `OK`).
- **is_recurring** (boolean): Si la tarea es recurrente.
- **recurrence_type** (text, opcional): Tipo de recurrencia (`daily`, `weekly`, `monthly`).
- **interval** (integer, opcional): Intervalo de recurrencia.
- **days_of_week** (integer[], opcional): Días de la semana (para recurrencia semanal).
- **day_of_month** (integer, opcional): Día del mes (para recurrencia mensual).
- **recurrence_end_date** (date, opcional): Fin de la recurrencia.
- **created_at** (timestamp): Fecha de creación.

### Tabla: task_evidence
- **id** (uuid, PK): Identificador único de la evidencia.
- **task_id** (uuid, FK): Tarea asociada (relación con `tasks`).
- **store_id** (uuid, FK): Tienda asociada (relación con `stores`).
- **url** (text): URL del archivo en Supabase Storage.
- **uploaded_by_auth_id** (uuid, FK): Usuario que subió la evidencia.
- **created_at** (timestamp): Fecha de subida.

## Funcionalidades Principales
- Autenticación y registro de usuarios (Supabase Auth).
- Gestión de tareas: creación, edición, asignación, recurrencia, cambio de estado, filtros avanzados y vistas (tabla, grid, calendario).
- Subida y visualización de evidencias por tarea.
- Panel de administración para usuarios y tiendas (alta, edición, eliminación).
- Dashboard con métricas y gráficos.
- Vista de tienda para supervisores y admins.
- Experiencia responsive, navegación por roles y modales para acciones clave.
- **Creación conjunta de Tarea + Anuncio:** Permite crear una tarea y un anuncio asociado en un solo paso, útil para tareas urgentes que requieren recordatorio y acción inmediata.
- **Gestión de Cambios de Precio:** Subida de planillas de precios, posibilidad de marcar productos actualizados y lógica similar para descuentos. Soporte para subtareas y carga de archivos tipo Excel.
- **Jerarquía de Cuentas y Roles:** Estructura jerárquica avanzada (Admin, Backoffice, Head of Stores, Jefe de Tienda, Vendedores) y asociación de usuarios a grupos de tiendas para avisos/tareas masivas y reasignación flexible.
- **Sección de Recomendaciones entre Tiendas:** Espacio para compartir tips, recomendaciones o anuncios de una tienda a otra, tipo "anuncios" pero entre tiendas.
- **Vista de Tiendas Completadas:** Estadísticas y reportes para Admin/Backoffice sobre qué tiendas han completado tareas, con acceso rápido para crear alertas a tiendas pendientes.
- **Tarea Planilla:** Permite que tiendas llenen planillas (formularios), con posibilidad de exportar y consolidar respuestas en una sola planilla para Backoffice.
- **Buzón Tienda → Backoffice:** Sección para que tiendas envíen información, consultas o tareas al backoffice (fallas, preguntas, avisos, robos, pedidos, etc.) sin que sea una tarea creada por BO, centralizando la comunicación y seguimiento.
- **Chat individuales → Tareas Masivas:** Chat/muro por tarea masiva (ej: cambios de precio) para que cada tienda pueda comentar y el backoffice vea el estado y comentarios por tienda.
- **Interfaz especial para Tareas Rutinarias:** Panel/checklist rápido para tareas diarias (apertura/cierre), con checklists precargados y marcación ágil.
- **Input numérico en tareas:** Permite ingresar cantidades o valores numéricos como parte del cumplimiento de la tarea.
- **Input para rayar sobre imagen:** Permite marcar sobre mapas o imágenes para indicar ubicaciones o incidencias.
- **Firma digital:** Solicita firma de responsable para tareas que lo requieran.
- **Condición fotográfica como toggle:** Permite mostrar/ocultar la necesidad de evidencia fotográfica según el tipo de tarea.
- **Restricción horaria:** Permite definir ventanas horarias para la ejecución de tareas urgentes o sensibles a tiempo.
- **Ubicación exacta:** Permite adjuntar o marcar la ubicación exacta dentro de la tienda para ciertas tareas.
- **Evidencia específica por tienda:** La evidencia subida por una tienda solo es visible para esa tienda y el administrador, no para todas las tiendas con la misma tarea.
- **Checklists precargados:** Checklists predefinidos para tareas recurrentes (ej: apertura de tienda) que pueden ser marcados como completados.
- **Envío de mensajes/recordatorios directos:** Permite enviar mensajes o recordatorios automáticos a tiendas o usuarios para recordar tareas pendientes.
- **Vista para vendedores:** Vista simplificada donde los vendedores solo ven comunicados y tareas asignadas a su tienda.

---

## Setup y Configuración

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Configurar variables de entorno de Supabase:
   Crea un archivo `.env` en la raíz del proyecto:
   ```env
   VITE_SUPABASE_URL=tu_url_supabase
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   ```
3. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   La app estará disponible en la URL que imprime Vite (típicamente `http://localhost:5173`).

---

## Build para Producción

```bash
npm run build
```
Los archivos generados estarán en el directorio `dist`.

---

## Notas y Recomendaciones
- El proyecto no requiere backend propio ni mock API.
- Toda la lógica de negocio y persistencia se realiza vía Supabase.
- Para producción, asegúrate de configurar correctamente las reglas de seguridad de Supabase.
- El sistema es fácilmente escalable y adaptable a nuevas funcionalidades.

---

## Contacto y Soporte
Para dudas, soporte o contribuciones, contacta al equipo de desarrollo o abre un issue en el repositorio.

