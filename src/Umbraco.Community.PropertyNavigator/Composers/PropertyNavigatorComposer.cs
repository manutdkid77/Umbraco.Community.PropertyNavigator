using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using Umbraco.Cms.Api.Management.OpenApi;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Community.PropertyNavigator.Configuration;

namespace Umbraco.Community.PropertyNavigator.Composers;

public class PropertyNavigatorComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.Configure<PropertyNavigatorOptions>(
            builder.Config.GetSection(Constants.ConfigurationSection));

        // Own Swagger document (browsable at /umbraco/swagger), secured with backoffice auth.
        builder.Services.Configure<SwaggerGenOptions>(opt =>
        {
            opt.SwaggerDoc(Constants.ApiName, new OpenApiInfo
            {
                Title = "Property Navigator Backoffice API",
                Version = "1.0",
            });
            opt.OperationFilter<PropertyNavigatorOperationSecurityFilter>();
        });
    }

    public class PropertyNavigatorOperationSecurityFilter : BackOfficeSecurityRequirementsOperationFilterBase
    {
        protected override string ApiName => Constants.ApiName;
    }
}
