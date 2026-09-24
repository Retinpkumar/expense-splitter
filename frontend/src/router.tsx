import { createBrowserRouter } from "react-router-dom";
import { GroupDetailPage } from "./pages/GroupDetailPage";
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
  {
    path: "/groups/:groupId",
    element: <GroupDetailPage />,
  },
]);
