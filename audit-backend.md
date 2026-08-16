---
name: Auditoría Completa de Backend
description: Habilidad especializada en Red Teaming, búsqueda de vulnerabilidades OWASP Top 10, condiciones de carrera y fallos de lógica de negocio en entornos Node.js/PostgreSQL.
---

# Skill: Auditoría Completa de Backend

Cuando ejecutes esta habilidad, debes revisar los archivos del backend bajo estos tres pilares con un enfoque de "Confianza Cero" (Zero Trust):

1. **Seguridad (Ciberseguridad & Red Teaming):** 
   - Busca fallos de Inyección (SQLi, NoSQLi, Command Injection).
   - Middleware de autenticación roto o evasión de validación de tokens (Bypass).
   - Exposición de secretos o variables críticas en texto plano.
   - Protección insuficiente contra CSRF o Rate Limiting.

2. **Backend (Infraestructura y Concurrencia):** 
   - Revisa la gestión de errores (asegura que no se expongan *stack traces* completos al cliente).
   - Busca llamadas asíncronas vulnerables a *Race Conditions* (condiciones de carrera), especialmente en bases de datos sin transacciones (e.g. cláusulas `FOR UPDATE`).
   - Fugas de memoria o conexiones de bases de datos que no se cierran.

3. **Lógica de Negocio (Edge Cases):** 
   - Valida el manejo de datos nulos, indefinidos o campos inesperados (`NaN`, números negativos, desbordamientos de enteros).
   - Manipulación de estado (State Mutation) indebida en procesos paralelos.

**Instrucción Operativa:**
*No asumas que el código es seguro.* Destroza la lógica conceptualmente. Si encuentras un fallo, propón un plan (Modo Plan) explicando la vulnerabilidad antes de modificar el archivo.
