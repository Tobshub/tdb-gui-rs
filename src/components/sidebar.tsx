import { IconButton } from "@mui/material";
import { Link, Outlet } from "react-router-dom";
import AddCircleIcon from "@mui/icons-material/AddCircle";

export default function SideBar() {
  return (
    <div className="page">
      <header>
        <span style={{ display: "flex", alignItems: "center" }}>
          <h2 className="display-large">Connections</h2>
          <Link to="/new">
            <IconButton>
              <AddCircleIcon htmlColor="white" />
            </IconButton>
          </Link>
        </span>
        <nav></nav>
      </header>
      <Outlet />
    </div>
  );
}
