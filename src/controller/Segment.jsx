export function Segment({id, children, style}) {
    return(
        // Las tarjetas que se muestran en el dashboard, cada una con su id para poder darles estilos diferentes, se pueden agregar mas cosas despues
        <div className="Datos" id={id} style={style}>
            {children}
        </div>
    )
}