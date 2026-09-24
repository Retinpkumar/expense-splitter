import { createBrowserRouter } from "react-router-dom";
import { GroupPage } from "./pages/GroupPage";
import { HomePage } from "./pages/HomePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/groups",
    element: <GroupPage />,
  },
]);
