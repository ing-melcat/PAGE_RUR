CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION auto_fill_user_data()
RETURNS trigger AS $$
BEGIN
    -- 1. Contraseña automática: 
    -- Si no se provee contraseña, se usa la matrícula como contraseña por defecto.
    -- Si se provee en texto plano, se encripta automáticamente.
    IF NEW.password_hash IS NULL OR NEW.password_hash = '' THEN
        NEW.password_hash := crypt(NEW.matricula, gen_salt('bf'));
    ELSIF NEW.password_hash NOT LIKE '$2a$%' AND NEW.password_hash NOT LIKE '$2y$%' THEN
        NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf'));
    END IF;

    -- 2. Autocompletado de Grupo tomando en cuenta datos ya creados:
    -- Si no se especifica un grupo al crear el usuario en Adminer, 
    -- tomará automáticamente el grupo del último usuario registrado.
    IF NEW.grupo IS NULL OR NEW.grupo = '' THEN
        NEW.grupo := (SELECT grupo FROM users WHERE grupo IS NOT NULL AND grupo != '' ORDER BY id DESC LIMIT 1);
    END IF;

    -- 3. Rol por defecto
    IF NEW.rol IS NULL OR NEW.rol = '' THEN
        NEW.rol := 'operador';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_fill_user ON users;
CREATE TRIGGER trigger_auto_fill_user
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION auto_fill_user_data();
