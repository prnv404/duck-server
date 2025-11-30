# Integration System

A modular, simple, and scalable system for managing external integrations in your NestJS application.

## Features

- **Plug-and-Play**: Easily add or remove integrations without changing business logic.
- **Type-Safe**: Full TypeScript support with generics for configuration and integration types.
- **Central Registry**: Single point of access for all integrations.
- **Lifecycle Management**: Automatic initialization, connection, and disconnection handling.
- **Health Checks**: Built-in health monitoring for all integrations.

## Quick Start

### 1. Register an Integration

In your module (e.g., `AppModule` or a specific feature module), register the integration with the registry.

```typescript
// app.module.ts (or a dedicated setup file)
export class AppModule implements OnModuleInit {
  constructor(private registry: IntegrationRegistry) {}

  async onModuleInit() {
    // Register Email Integration
    await this.registry.register(new EmailIntegration(), {
      autoInitialize: true,
      autoConnect: true
    });

    // Initialize with config
    const email = this.registry.get<EmailIntegration>('email');
    await email.initialize({
      enabled: true,
      defaultFrom: 'noreply@example.com',
      smtp: { /* ... */ }
    });
  }
}
```

### 2. Use an Integration

Inject the `IntegrationRegistry` into your service and retrieve the integration by name.

```typescript
@Injectable()
export class UserService {
  constructor(private registry: IntegrationRegistry) {}

  async welcomeUser(user: User) {
    // Get the integration (throws if not found or disabled)
    const emailService = this.registry.get<EmailIntegration>('email');

    await emailService.sendEmail(
      user.email,
      'Welcome!',
      'Welcome to our platform!'
    );
  }
}
```

## Creating a Custom Integration

Implement the `BaseIntegration` interface:

```typescript
import { BaseIntegration, BaseIntegrationConfig } from '@/integrations';

interface MyConfig extends BaseIntegrationConfig {
  apiKey: string;
}

export class MyIntegration implements BaseIntegration<MyConfig> {
  readonly name = 'my-service';
  readonly version = '1.0.0';
  
  private config: MyConfig;

  get enabled() { return this.config?.enabled ?? false; }

  async initialize(config: MyConfig) {
    this.config = config;
  }

  async connect() {
    // Connect to external service
  }

  async disconnect() {
    // Cleanup
  }

  async healthCheck() {
    return { healthy: true };
  }
  
  // Your custom methods
  async doSomething() {
    // ...
  }
}
```

## Core Components

- **IntegrationRegistry**: Manages all integrations.
- **BaseIntegration**: Interface that all integrations must implement.
- **IntegrationModule**: Global module that provides the registry.
