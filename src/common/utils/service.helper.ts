import { ConflictError, NotFoundError } from '@/common/exceptions';

export class ServiceHelper {
    /**
     * Ensures that an entity exists. If not, throws a NotFoundError.
     * @param entity The entity to check.
     * @param id The ID of the entity (for the error message).
     * @param entityName The name of the entity (for the error message). Defaults to 'Entity'.
     * @returns The entity if it exists.
     */
    static ensureExists<T>(entity: T | null | undefined, id: string | number, entityName: string = 'Entity'): T {
        if (!entity) {
            throw new NotFoundError(`${entityName} with ID ${id} not found.`);
        }
        return entity;
    }

    /**
     * Ensures that a condition (uniqueness) is met. If not, throws a ConflictError.
     * @param condition The condition to check. If true, it means the entity already exists (conflict).
     * @param message The error message to throw if the condition is true.
     */
    static ensureUnique(condition: boolean, message: string = 'Entity already exists.'): void {
        if (condition) {
            throw new ConflictError(message);
        }
    }
}
