import { createHashRouter } from 'react-router-dom'
import MainWindow from '@/components/layout/MainWindow'
import { ProjectsFavorites } from '@/components/projects/ProjectsFavorites'
import { HomeWelcome } from '@/components/home/HomeWelcome'
import { ProjectBoardView } from '@/components/projects/ProjectBoardView'
import { NotesView } from '@/components/notes/NotesView'
import { BoardDrawView } from '@/components/draws/BoardDrawView'

export const appRouter = createHashRouter([
  {
    path: '/',
    element: <MainWindow />,
    children: [
      {
        index: true,
        element: <HomeWelcome />,
      },
      {
        path: 'projects/favorites',
        element: <ProjectsFavorites />,
      },
      {
        path: 'projects/:boardId',
        element: <ProjectBoardView />,
      },
      {
        path: 'projects/:boardId/notes',
        element: <NotesView />,
      },
      {
        path: 'projects/:boardId/draws',
        element: <BoardDrawView />,
      },
    ],
  },
])
