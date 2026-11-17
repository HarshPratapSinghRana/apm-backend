using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using EngineeringCommons.Backend.Data;
using EngineeringCommons.Backend.Services.Implementations;
using EngineeringCommons.Backend.Models;

namespace EngineeringCommons.Backend.IntegrationTests;

/// <summary>
/// Custom WebApplicationFactory that configures test users and isolated DbContext for integration tests
/// </summary>
public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = "IntegrationTestDb_" + Guid.NewGuid().ToString("N");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove existing DbContextOptions
            var dbDescriptors = services.Where(d => 
                d.ServiceType == typeof(DbContextOptions<CipDbContext>) || 
                d.ServiceType == typeof(DbContextOptions)).ToList();

            foreach (var d in dbDescriptors)
            {
                services.Remove(d);
            }

            // Register in-memory DbContext for isolated integration testing
            services.AddDbContext<CipDbContext>(options =>
                options.UseInMemoryDatabase(_dbName));

            // Remove the existing StaticAuthOptions configuration
            var descriptor = services.FirstOrDefault(d => 
                d.ServiceType == typeof(Microsoft.Extensions.Options.IConfigureOptions<StaticAuthOptions>));
            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            // Add test-specific configuration with hardcoded test users
            services.Configure<StaticAuthOptions>(opts =>
            {
                opts.Users = new List<User>
                {
                    new User 
                    { 
                        Email = "producer@company.com", 
                        Password = "password", 
                        Role = "PRODUCER" 
                    },
                    new User 
                    { 
                        Email = "reviewer@company.com", 
                        Password = "password", 
                        Role = "REVIEWER" 
                    },
                    new User 
                    { 
                        Email = "consumer@test.com", 
                        Password = "Consumer@123", 
                        Role = "CONSUMER" 
                    }
                };
            });
        });
    }
}
