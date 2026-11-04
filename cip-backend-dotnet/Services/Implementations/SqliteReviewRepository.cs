using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using CipBackend.Data;
using CipBackend.Models;
using CipBackend.Services.Interfaces;

namespace CipBackend.Services.Implementations;

public class SqliteReviewRepository : IReviewRepository
{
    private readonly IServiceScopeFactory _scopeFactory;

    public SqliteReviewRepository(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public void Add(Review r)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();

        var existing = db.Reviews.Find(r.Id);
        if (existing == null)
        {
            db.Reviews.Add(r);
        }
        else
        {
            db.Entry(existing).CurrentValues.SetValues(r);
        }
        db.SaveChanges();
    }

    public Review? Get(string id)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();
        return db.Reviews.AsNoTracking().FirstOrDefault(r => r.Id == id);
    }

    public IEnumerable<Review> List()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();
        return db.Reviews.AsNoTracking().OrderByDescending(r => r.SubmittedAt).ToList();
    }
}
