import { jest } from "@jest/globals";

declare global {
    namespace Unit.Domain.HR {
        type RepositoryMock<Entity> = {
            findUniqueOrThrow: jest.Mock<(props: unknown) => Promise<Entity>>;
            findUnique: jest.Mock<(props: unknown) => Promise<Optional<Entity>>>;
            find: jest.Mock<(props: unknown) => Promise<Entity[]>>;
        };
    }
}
