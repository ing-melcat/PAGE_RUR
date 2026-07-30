export function Login() {
    return (
        <div className="login">
            <h3>Login</h3>
            <hr></hr>
            <label>Identity</label>
            <br></br>
            <input type="text" placeholder="Enter your Username" />
            <br></br>
            <label>Password</label>
            <br></br>
            <input type="password" placeholder="Enter your Password" />
            <br></br>
            <button id="connect-button">Connect</button>
        </div>
    )
}