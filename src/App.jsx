import AdminUpload from "./components/AdminUpload";
import ChatWindow from "./components/ChatWindow";
import "./App.css";

function App() {
    return (
        <div className="app">
            <header className="app-header">Ask Your Data</header>

            <AdminUpload />

            <ChatWindow />
        </div>
    );
}

export default App;
